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

let gameMode="normal"
let reverseMode=false

let turnTimer=null

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

gameMode="normal"
reverseMode=false

showInputText()

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

if(gameMode==="turbo" || gameMode==="hardcore"){

arcadeMessage("⚠ INTRODUCE SECUENCIA INVERSA","#ff5252")

}

generateSequence()

setTimeout(()=>{

playSequence(0)

},800)

}

/* GENERATE SEQUENCE */

function generateSequence(){

sequence=[]

for(let i=0;i<fase+2;i++){
sequence.push(Math.floor(Math.random()*8))
}

if(reverseMode){
sequence=[...sequence].reverse()
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

setTimeout(()=>{
startTurnTimer()
},1000)

return

}

let s=sequence[index]

lightInput(s)

let randomSpeed = sequenceSpeed + Math.random()*120 - 60
let randomGap = gapSpeed + Math.random()*100 - 50

setTimeout(()=>{

turnOffInput(s)

setTimeout(()=>{
playSequence(index+1)
},randomGap)

},randomSpeed)

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

clearTimeout(turnTimer)
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

let comboMultiplier=Math.min(comboCount,5)

if(comboCount>=3){

comboBonus=comboMultiplier*100
arcadeMessage("🔥 COMBO x"+comboMultiplier,"#ff7043")

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
comboCount=0
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

/* romper combo si usa retry */
comboCount=0

/* si estaba detenido */

if(gameStopped){

gameStopped=false
startRun()

document.getElementById("mensaje").innerText="Continuando partida"

/* reiniciar secuencia completa */
setTimeout(()=>{
playSequence(0)
},400)

return

}

/* si estaba en turno normal */

if(playerTurn){

clearTimeout(turnTimer)
clearInterval(timeBarInterval)

document.getElementById("mensaje").innerText="Repitiendo secuencia"

setTimeout(()=>{
playSequence(0)
},300)

}

}

/* STOP */

function stopGame(){

if(gameOver) return

playerTurn=false
gameStopped=true

/* detener temporizador */
clearTimeout(turnTimer)

/* detener barra de tiempo si existe */
clearInterval(timeBarInterval)

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

gameMode="hardcore"
reverseMode=true

hideInputText()

showMode("🔥 HARDCORE MODE")

}else if(fase>=15){

sequenceSpeed=340
gapSpeed=200

gameMode="turbo"
reverseMode=true

showInputText()

arcadeMessage("⚠ SECUENCIA INVERSA","#ff5252")
showMode("⚡ TURBO MODE")

}else if(fase>=10){

sequenceSpeed=420
gapSpeed=240

gameMode="fast"
reverseMode=false

hideInputText()

showMode("🚀 FAST MODE")

}else{

sequenceSpeed=500
gapSpeed=300

gameMode="normal"
reverseMode=false

showInputText()

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

function hideInputText(){

for(let i=0;i<8;i++){

let el=document.getElementById("I"+i)

if(el) el.innerText=""

}

}

function showInputText(){

for(let i=0;i<8;i++){

let el=document.getElementById("I"+i)

if(el) el.innerText="I"+i

}

}

function startTurnTimer(){

clearTimeout(turnTimer)

/* tiempo base según longitud de secuencia */

let maxTime = 2000 + sequence.length * 350

/* modos avanzados más exigentes */

if(gameMode==="turbo") maxTime *= 0.85
if(gameMode==="hardcore") maxTime *= 0.75

/* empezar barra visual */

startTimeBar(maxTime)

/* iniciar contador real */

turnTimer=setTimeout(()=>{

arcadeMessage("⏱ TIME OUT","#ff4444")
lose()

},maxTime)

}

/* ============================= */
/* SAFE DEV MODE PLC GAME       */
/* ============================= */

let devMode=false
let devPanel=null
const DEV_PASSWORD="plcdev"

/* ACTIVADOR SIMPLE */

document.addEventListener("keydown",function(e){

/* activar dev mode con F8 */

if(e.key==="F8"){

let pass=prompt("Developer password")

if(pass===DEV_PASSWORD){

toggleDevMode()

}else{

arcadeMessage("ACCESS DENIED","#ff4444")

}

}

/* comandos solo si dev activo */

if(!devMode) return

if(e.key==="1"){

fase=9
updateSpeed()
arcadeMessage("FASE 9")

}

if(e.key==="2"){

fase=10
updateSpeed()
arcadeMessage("FAST MODE")

}

if(e.key==="3"){

fase=15
updateSpeed()
arcadeMessage("TURBO MODE")

}

if(e.key==="4"){

fase=20
updateSpeed()
arcadeMessage("HARDCORE MODE")

}

if(e.key==="w"){

win()

}

if(e.key==="e"){

lose()

}

if(e.key==="s"){

sequence=[0,1,2,3]
playSequence(0)

}

if(e.key==="o"){

for(let i=0;i<8;i++){

setTimeout(()=>{
activateOutput(i)
},i*200)

}

}

if(e.key==="r"){

startGame()

}

})

/* TOGGLE DEV */

function toggleDevMode(){

devMode=!devMode

if(devMode){

arcadeMessage("DEV MODE ON","#00e5ff")
createDevPanel()

}else{

arcadeMessage("DEV MODE OFF","#ff5252")

if(devPanel){
devPanel.remove()
devPanel=null
}

}

}

/* PANEL */

function createDevPanel(){

devPanel=document.createElement("div")

devPanel.style.position="fixed"
devPanel.style.right="10px"
devPanel.style.bottom="10px"
devPanel.style.width="260px"
devPanel.style.background="#111"
devPanel.style.color="#0f0"
devPanel.style.padding="10px"
devPanel.style.fontFamily="monospace"
devPanel.style.fontSize="12px"
devPanel.style.border="2px solid #0f0"
devPanel.style.zIndex="9999"

devPanel.innerHTML=`
<b>DEV MODE</b>
<hr>

F8 → activar dev

1 → fase 9  
2 → fast  
3 → turbo  
4 → hardcore  

S → secuencia test  
W → win  
E → error  

O → outputs  
R → restart

`

document.body.appendChild(devPanel)

}

/* FULLSCREEN ON CLICK */

document.addEventListener("click",function(){

if(!document.fullscreenElement){

document.documentElement.requestFullscreen().catch(()=>{})

}

})

/* TIME BAR */

let timeBarInterval=null

function startTimeBar(maxTime){

let bar=document.getElementById("timeBar")

if(!bar) return

bar.style.width="100%"

let start=Date.now()

clearInterval(timeBarInterval)

timeBarInterval=setInterval(()=>{

let elapsed=Date.now()-start

let percent=100-(elapsed/maxTime*100)

if(percent<30){
bar.style.background="#ff5252"
}

if(percent<0) percent=0

bar.style.width=percent+"%"

if(percent<=0){

clearInterval(timeBarInterval)

}

},50)

}