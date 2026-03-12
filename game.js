import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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

let sequenceSpeed=500
let gapSpeed=300

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

if(soundEnabled){

btn.innerText="🔊"

}else{

btn.innerText="🔇"

}

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

scoreSaved=false
gameOver=false

resetOutputs()

document.getElementById("score").innerText="Score 0"
document.getElementById("fase").innerText="Fase 1"
document.getElementById("mensaje").innerText="Memoriza la secuencia"

document.getElementById("errorLed").classList.remove("on")

startRun()

updateSpeed()

nextRound()

updateRankingFromServer()

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

score+=fase*100

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

saveScore()

}

/* RETRY */

function retry(){

gameOver=false

document.getElementById("errorLed").classList.remove("on")

startRun()

playSequence(0)

}

/* STOP */

function stopGame(){

playerTurn=false
gameOver=true

stopRun()

document.getElementById("errorLed").classList.add("on")

saveScore()

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

setTimeout(()=>{
div.remove()
},2000)

}

/* SAVE SCORE */

async function saveScore(){

if(!gameOver)return
if(score===0)return
if(scoreSaved)return

scoreSaved=true

try{

await addDoc(collection(db,"ranking"),{
name:player,
score:score,
time:Date.now()
})

await cleanRanking()

showNewRecord()

}catch(e){

console.log("firebase error:",e)

}

updateRankingFromServer()

}

/* CLEAN RANKING */

async function cleanRanking(){

let q=query(collection(db,"ranking"),orderBy("score","desc"))
let snapshot=await getDocs(q)

let bestScores={}
let docs=[]

snapshot.forEach(d=>{

let data=d.data()

docs.push({
id:d.id,
name:data.name,
score:data.score
})

if(!bestScores[data.name] || data.score>bestScores[data.name]){
bestScores[data.name]=data.score
}

})

for(let r of docs){

if(bestScores[r.name]!==r.score){

await deleteDoc(doc(db,"ranking",r.id))

}

}

let sorted=[...docs].sort((a,b)=>b.score-a.score)

let extra=sorted.slice(100)

for(let r of extra){

await deleteDoc(doc(db,"ranking",r.id))

}

}

/* NEW RECORD */

function showNewRecord(){

let div=document.createElement("div")

div.innerText="🏆 NEW RECORD!"

div.style.position="fixed"
div.style.top="40%"
div.style.left="50%"
div.style.transform="translate(-50%,-50%)"
div.style.background="#00ff7b"
div.style.color="black"
div.style.padding="20px 40px"
div.style.fontSize="30px"
div.style.fontWeight="bold"
div.style.borderRadius="10px"
div.style.boxShadow="0 0 40px #00ff7b"
div.style.zIndex="9999"

document.body.appendChild(div)

setTimeout(()=>{
div.remove()
},2500)

}

/* UPDATE RANKING */

async function updateRankingFromServer(){

try{

let q=query(collection(db,"ranking"),orderBy("score","desc"),limit(10))

let snapshot=await getDocs(q)

rankingCache=[]

snapshot.forEach(doc=>{
rankingCache.push(doc.data())
})

generateBossRecords()

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

if(rankingCache.length>=10)return

let missing=10-rankingCache.length

for(let i=0;i<missing;i++){

await addDoc(collection(db,"ranking"),{
name:bossPlayers[Math.floor(Math.random()*bossPlayers.length)],
score:Math.floor(2000+Math.random()*2500),
time:Date.now()
})

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