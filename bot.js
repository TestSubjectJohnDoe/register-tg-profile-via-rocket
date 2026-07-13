const { driver } = require('@rocket.chat/sdk');
const { TelegramBot } = require('node-telegram-bot-api');
require('dotenv').config();

const HOST = process.env.ROCKETCHAT_URL;
const USER = process.env.USER_NAME;
const PASS = process.env.USER_PASS;
const TOKEN = process.env.TELEGRAM_TOKEN;
const SSL = true;
const ROOM = '';
const MAX_ATTEMPTS = 10;
const LIFETIME = 5 * 60 * 1000;

const sessions = new Map();
let myId;

function genCode() {
  return Math.floor(100000000000 + Math.random() * 900000000).toString();
}

function genTag() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)];
}

async function connRc() {
  try {
    await driver.connect({ host: HOST, useSsl: SSL });
    myId = await driver.login({ username: USER, password: PASS });
    return true;
  } catch (e) {
    return false;
  }
}

async function sendRc(text, tag) {
  if (!myId) {
    const ok = await connRc();
    if (!ok) throw new Error('нет связи с рокетом');
  }
  
  const msg = tag ? `[${tag}] ${text}` : text;
  await driver.sendToRoom(msg, ROOM);
}

function getSess(chatId) {
  const s = sessions.get(chatId);
  if (!s) return null;
  if (Date.now() - s.started > LIFETIME) {
    s.status = 'expired';
    sessions.set(chatId, s);
    return s;
  }
  return s;
}

async function newSess(chatId) {
  const code = genCode();
  const tag = genTag();
  const sess = {
    code,
    tag,
    attempts: 0,
    started: Date.now(),
    status: 'waiting'
  };
  sessions.set(chatId, sess);
  await sendRc('---');
  await sendRc(code);
  await sendRc('код работает до 5 минут и бот тг примет до 10 попыток', tag);
  await sendRc('---');
  return sess;
}

async function handleCode(chatId, text, bot) {
  const s = getSess(chatId);
  if (!s) {
    await bot.sendMessage(chatId, 'нет активной сессии. /numbers для начала.');
    return;
  }
  if (s.status === 'completed') {
    await bot.sendMessage(chatId, 'ты уже подтвердил код, больше нельзя.');
    return;
  }
  if (s.status === 'expired') {
    await bot.sendMessage(chatId, 'время истекло. жми /numbers заново.');
    return;
  }
  if (s.attempts >= MAX_ATTEMPTS) {
    s.status = 'expired';
    sessions.set(chatId, s);
    await bot.sendMessage(chatId, 'все 10 попыток сожрал. /numbers для нового.');
    return;
  }
  const input = text.trim();
  if (input === s.code) {
    s.status = 'completed';
    sessions.set(chatId, s);
    await bot.sendMessage(chatId, 'верный код! доступ подтверждён к... (пока не знаю к каким каналам, списочек от дорогих мортиботоводов не помешал бы)');
  } else {
    s.attempts += 1;
    const rem = MAX_ATTEMPTS - s.attempts;
    sessions.set(chatId, s);
    if (rem > 0) {
      await bot.sendMessage(chatId, `неверно, осталось ${rem} попыток.`);
    } else {
      s.status = 'expired';
      sessions.set(chatId, s);
      await bot.sendMessage(chatId, 'попытки кончились. /numbers для нового.');
    }
  }
}

const bot = new TelegramBot(TOKEN, { polling: true });
bot.onText(/\/numbers/, async (msg) => {
  const chatId = msg.chat.id;
  const existing = getSess(chatId);
  if (existing && existing.status === 'completed') {
    await bot.sendMessage(chatId, 'ты уже успешно верифицировался, больше нельзя.');
    return;
  }

  if (existing && existing.status === 'waiting') {
    await bot.sendMessage(chatId, 'у тебя уже активный код, введи его или подожди 5 минут.');
    return;
  }
  try {
    const sess = await newSess(chatId);
    await bot.sendMessage(chatId, `код с тегом [${sess.tag}] улетел в рокет (комната ${ROOM}).\nу тебя 10 попыток и 5 минут, введи его сюда.`);
  } catch (e) {
    await bot.sendMessage(chatId, 'что-то с рокетом, попробуй позже или пиши в issues.');
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;
  const s = getSess(chatId);
  if (!s || s.status !== 'waiting') return;
  await handleCode(chatId, text, bot);
});

bot.onText(/\/cancel/, async (msg) => {
  const chatId = msg.chat.id;
  if (sessions.has(chatId)) {
    sessions.delete(chatId);
    await bot.sendMessage(chatId, 'сессия отменена.');
  } else {
    await bot.sendMessage(chatId, 'нет активной сессии.');
  }
});

(async () => {
  await connRc();
})();

process.on('SIGINT', () => {
  driver.disconnect();
  bot.stopPolling();
  process.exit(0);
});