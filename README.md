
# morty you son of a, i'm in

## how it works
- no need to trust noisy non‑opensource projects  
- no need to put it into general chat where your messages can be saved and later shown to your boss  
- easy, simple alternative. Perfect the way it is. Doesn't take much time to download dependencies or resources to host this bot.  
- doesn't look like that rkn bot that people had to put into tg channel after hitting 10k subs  
- your name is unknown, and you won't be displayed with your tag like some animal with a collar 
- IT'S FREE :D

## setup. Didn't test setup, but in era of Issues and Pull request tab - go nuts!
download source.zip from releases

cd register-tg-profile-via-rocket

npm install

---

set config .env

---

to change the target room, edit `ROOM` in `bot.js`:

const ROOM = 'room_name'; 

## telegram command
- `/numbers` – get a new code (if no active session for now)

## run
node bot.js

## and result
![As simple as that](images/untitled.png)

## notes
- bot sends messages to Rocket.Chat as you
- after successful verification, new `/numbers` is blocked

## license
do whatever you want tbh, i don't really care much.
