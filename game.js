import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

import {
getFirestore,
collection,
query,
orderBy,
limit,
getDocs,
deleteDoc,
doc,
getDoc,
setDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

/* FIREBASE */

const firebaseConfig={
apiKey:"AIzaSyCHD_4dYcJjRYw1LvMm03iDLNyktjOgIR4",
authDomain:"plc-training-game.firebaseapp.com",
projectId:"plc-training-game",
storageBucket:"plc-training-game.firebasestorage.app",
messagingSenderId:"444769439771",
appId:"1:444769439771:web:253d9651ebef96ab9ba8be"
}

const app=initializeApp(firebaseConfig)
const db=getFirestore(app)

/* VARIABLES */

let fase=1
let sequence=[]
let step=0
let playerTurn=false
let score=0
let player=""

let rankingCache=[]
let runInterval=null

let scoreSaved=false
let gameOver=false
let gameStopped=false

let sequenceSpeed=500
let gapSpeed=300

/* NUEVAS VARIABLES */

let turnStartTime=0
let gameStartTime=0
let comboCount=0

/* SOUND SYSTEM */

let soundEnabled=true

const soundButton=new Audio("sounds/button.mp3")
const soundRelay=new Audio("sounds/relay.mp3")
const soundValve=new Audio("sounds/valve.mp3")
const soundError=new Audio("sounds/error.mp3")

function playSound(sound){

if(!soundEnabled) return

sound.currentTime=0
sound.play()

}

function toggleSound(){

soundEnabled=!soundEnabled

let btn=document.getElementById("soundBtn")

btn.innerText=soundEnabled?"🔊":"🔇"

}

/* MENSAJE ARCADE */

function arcadeMessage(text,color="#ffd54f"){

let div=document.createElement("div")

div.innerText=text

div.style.position="fixed"
div.style.top="50%"
div.style.left="50%"
div.style.transform="translate(-50%,-50%)"
div.style.background=color
div.style.color="black"
div.style.padding="20px 40px"
div.style.fontSize="30px"
div.style.fontWeight="bold"
div.style.borderRadius="10px"
div.style.boxShadow="0 0 40px "+color
div.style.zIndex="9999"

document.body.appendChild(div)

setTimeout(()=>div.remove(),1500)

}

/* RUN LED */

function startRun(){

clearInterval(runInterval)

runInterval=setInterval(()=>{
document.getElementById("runLed").classList.toggle("on")
},500)

}

function stopRun(){

clearInterval(runInterval)
document.getElementById("runLed").classList.remove("on")

}

/* RESET OUTPUTS */

function resetOutputs(){

for(let i=0;i<8;i++){

let out=document.getElementById("Q"+i)

if(out) out.classList.remove("on")

}

}

/* START GAME */

function startGame(){

player=document.getElementById("playerName").value || "Anon"

score=0
fase=1
step=0
sequence=[]

comboCount=0
gameStartTime=Date.now()

scoreSaved=false
gameOver=false
gameStopped=false

resetOutputs()

document.getElementById("score").innerText="Score 0"
document.getElementById("fase").innerText="Fase 1"
document.getElementById("mensaje").innerText="Memoriza la secuencia"

document.getElementById("retryBtn").disabled=false
document.getElementById("errorLed").classList.remove("on")

startRun()

updateSpeed()

nextRound()

}

/* NEXT ROUND */

function nextRound(){

generateSequence()

setTimeout(()=>{
playSequence(0)
},800)

}

/* GENERATE SEQUENCE */

function generateSequence(){

if(sequence.length===0){

for(let i=0;i<fase+2;i++){
sequence.push(Math.floor(Math.random()*8))
}

}else{

sequence.push(Math.floor(Math.random()*8))

}

}

/* PLAY SEQUENCE */

function playSequence(index){

playerTurn=false

if(index>=sequence.length){

document.getElementById("mensaje").innerText="Tu turno"

playerTurn=true
step=0

turnStartTime=Date.now()

return

}

let s=sequence[index]

lightInput(s)

setTimeout(()=>{

turnOffInput(s)

setTimeout(()=>{
playSequence(index+1)
},gapSpeed)

},sequenceSpeed)

}

/* INPUT */

function pulse(i){

if(!playerTurn)return

playSound(soundButton)

lightInput(i)

setTimeout(()=>turnOffInput(i),200)

if(i!==sequence[step]){

comboCount=0
lose()
return

}

step++

if(step>=sequence.length){

win()

}

}

/* WIN */

function win(){

activateOutput((fase-1)%8)

/* BONUS VELOCIDAD */

let reactionTime=Date.now()-turnStartTime

let speedBonus=0

if(reactionTime<2000) speedBonus=300
else if(reactionTime<4000) speedBonus=200
else if(reactionTime<6000) speedBonus=100

if(speedBonus>0){
arcadeMessage("⚡ SPEED BONUS +"+speedBonus,"#00e5ff")
}

/* COMBO */

comboCount++

let comboBonus=0

if(comboCount>=3){

comboBonus=comboCount*100
arcadeMessage("🔥 COMBO x"+comboCount,"#ff7043")

}

/* SCORE */

score+=fase*100+speedBonus+comboBonus

document.getElementById("score").innerText="Score "+score

fase++

updateSpeed()

document.getElementById("fase").innerText="Fase "+fase

setTimeout(nextRound,1200)

}

/* LOSE */

function lose(){

playerTurn=false
gameOver=true

playSound(soundError)

stopRun()

document.getElementById("errorLed").classList.add("on")
document.getElementById("mensaje").innerText="Error de secuencia"
document.getElementById("retryBtn").disabled=true

saveScore()

}

/* RETRY */

function retry(){

if(gameOver) return

if(gameStopped){

gameStopped=false
startRun()

document.getElementById("mensaje").innerText="Continuando partida"

setTimeout(()=>playSequence(0),400)

return

}

if(playerTurn){

document.getElementById("mensaje").innerText="Repitiendo secuencia"

setTimeout(()=>playSequence(0),300)

}

}

/* STOP */

function stopGame(){

if(gameOver) return

playerTurn=false
gameStopped=true

stopRun()

document.getElementById("mensaje").innerText="Juego detenido"

}

/* OUTPUT */

function activateOutput(n){

let out=document.getElementById("Q"+n)

if(out) out.classList.add("on")

if(n>=4){
playSound(soundValve)
}else{
playSound(soundRelay)
}

}

/* INPUT LIGHT */

function lightInput(i){
document.getElementById("I"+i).classList.add("active")
}

function turnOffInput(i){
document.getElementById("I"+i).classList.remove("active")
}

/* SPEED MODES */

function updateSpeed(){

if(fase>=20){

sequenceSpeed=260
gapSpeed=160
showMode("🔥 HARDCORE MODE")

}else if(fase>=15){

sequenceSpeed=340
gapSpeed=200
showMode("⚡ TURBO MODE")

}else if(fase>=10){

sequenceSpeed=420
gapSpeed=240
showMode("🚀 FAST MODE")

}else{

sequenceSpeed=500
gapSpeed=300

}

}

/* SHOW MODE */

function showMode(text){

let div=document.createElement("div")

div.innerText=text

div.style.position="fixed"
div.style.top="50%"
div.style.left="50%"
div.style.transform="translate(-50%,-50%)"
div.style.background="#ffd54f"
div.style.color="black"
div.style.padding="20px 40px"
div.style.fontSize="30px"
div.style.fontWeight="bold"
div.style.borderRadius="10px"
div.style.boxShadow="0 0 30px #ffd54f"
div.style.zIndex="9999"

document.body.appendChild(div)

setTimeout(()=>div.remove(),2000)

}

/* SAVE SCORE */

async function saveScore(){

if(!gameOver || score===0 || scoreSaved) return

scoreSaved=true

let cleanName=player.trim()

if(cleanName.length<2) return

let totalTime=Math.floor((Date.now()-gameStartTime)/1000)

let efficiency=Math.floor(score/(totalTime+1))

try{

let playerRef=doc(db,"ranking",cleanName)

let snapshot=await getDoc(playerRef)

if(snapshot.exists()){

let oldScore=snapshot.data().score

if(score<=oldScore) return

}

await setDoc(playerRef,{
name:cleanName,
score:score,
efficiency:efficiency,
time:Date.now()
})

await cleanRanking()

}catch(e){

console.log("firebase error:",e)

}

updateRankingFromServer()

}

/* CLEAN RANKING */

async function cleanRanking(){

let q=query(collection(db,"ranking"),orderBy("score","desc"))
let snapshot=await getDocs(q)

let docs=[]

snapshot.forEach(d=>{
docs.push({id:d.id,...d.data()})
})

if(docs.length<=20) return

let extra=docs.slice(20)

for(let r of extra){
await deleteDoc(doc(db,"ranking",r.id))
}

}

/* UPDATE RANKING */

async function updateRankingFromServer(){

try{

let q=query(
collection(db,"ranking"),
orderBy("score","desc"),
limit(20)
)

let snapshot=await getDocs(q)

rankingCache=[]

snapshot.forEach(doc=>{
rankingCache.push(doc.data())
})

await generateBossRecords()

showRecord()

}catch(e){

console.log("ranking error")

}

}

/* BOSS PLAYERS */

async function generateBossRecords(){

let bossPlayers=[
"CyberOperator",
"PLC_MASTER",
"FactoryBot",
"MechaEngineer",
"AutomationAI",
"ControlUnit7",
"SiemensGhost",
"DeltaCore"
]

if(rankingCache.length>=20) return

let missing=20-rankingCache.length

for(let i=0;i<missing;i++){

let name=bossPlayers[Math.floor(Math.random()*bossPlayers.length)]

await setDoc(
doc(db,"ranking","bot_"+name+i),
{
name:name,
score:Math.floor(2000+Math.random()*2500),
time:Date.now()
}
)

}

}

/* SHOW RECORD */

function showRecord(){

if(rankingCache.length===0)return

let best=rankingCache[0]

document.getElementById("recordName").innerText=best.name
document.getElementById("recordScore").innerText=best.score

}

/* RANKING PANEL */

function toggleRanking(){

let panel=document.getElementById("rankingList")

if(panel.style.display==="block"){

panel.style.display="none"
return

}

panel.style.display="block"

panel.innerHTML=""

rankingCache.forEach((r,i)=>{

let medal=""

if(i==0) medal="🥇"
if(i==1) medal="🥈"
if(i==2) medal="🥉"

let p=document.createElement("p")

p.innerText=medal+" "+r.name+"   "+r.score

panel.appendChild(p)

})

}

/* EXPORT */

window.startGame=startGame
window.pulse=pulse
window.retry=retry
window.stopGame=stopGame
window.toggleRanking=toggleRanking
window.toggleSound=toggleSound

/* INIT */

updateRankingFromServer()