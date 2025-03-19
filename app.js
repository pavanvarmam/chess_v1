import express from 'express'
import bodyParser from 'body-parser'
import crypto from 'crypto'
import { fileURLToPath } from 'url';
import path from 'path'
import { WebSocketServer } from 'ws';
import { type } from 'os';
const app = express()
const PORT = 5000;
const rooms = []
const posFen = {
    classic: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
}

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())

app.get('/', (req,res)=>{
    res.sendFile(path.join(__dirname, 'public', 'home', 'home.html'))
})

app.get('/create-room', (req,res)=>{
    console.log("Create room request received");
    const room_code = crypto.randomBytes(8).toString('hex')
    const queryData = req.query
    const room_data = {
        p1:{
            name:queryData['p1-name'],
            color:queryData['player-color'] === 'white' || queryData['player-color'] === 'black' 
            ? queryData['player-color'][0] 
            : 'w',
            // time:queryData['session-time'],
            time:1,
            isJoined:false,
            ws:null
        },
        p2:{
            name:queryData['p2-name'],
            color:queryData['player-color'] === 'white' || queryData['player-color'] === 'black' 
            ? queryData['player-color'] === 'white' ? 'b' : 'w'
            : 'b',
            // time:queryData['session-time'],
            time:0.2,
            isJoined:false,
            ws:null
        },
        id:room_code,
        pos:posFen['classic'],
        lastMove:[],
        captures:{
            w:[],
            b:[]
        }
    }
    rooms.push(room_data)
    console.log(rooms);
    res.send({url:`/game/room/${room_code}`, code:room_code})
})

app.get('/game/room/:room_code', (req, res)=>{
    const room_code = req.params.room_code
    const room = findRoomById(room_code)
    if(!room){
        res.sendFile(path.join(__dirname, 'public', '404','404.html'))
        return
    }
    if(room.p1.isJoined && room.p2.isJoined){
        res.send({code:400, message:'room is full join as spectator to view match'})
        return
    }
    res.sendFile(path.join(__dirname, 'public' , 'game', 'online', 'game.html'))
})

app.get('/game/offline', (req, res)=>{
    res.sendFile(path.join(__dirname, 'public', 'game', 'offline', 'game.html'))
})

const server = app.listen(PORT, (err)=>{
    if (err) {
        console.log(err);
        return
    }
    console.log("Server started at "+PORT);
});

////////////

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('Client connected, uid created');
    ws.uid = crypto.randomBytes(4).toString('hex')
    console.log(ws.uid);
    

    // Handle incoming messages from the client
    ws.on('message', (message) => {
        const data = JSON.parse(message)
        if(data){
            if(data.type === 'join'){
                const room_code = data.room_code;
                const room = findRoomById(room_code)
                if(room){
                    let data = null
                    if(room.p1.isJoined){
                        data = {
                            turn:room.p2.color,
                            data:{
                                name:room.p2.name,
                                time:room.p2.time
                            },
                            posFen:room.pos,
                            lastMove:room.lastMove,
                            captures:room.captures
                        }
                        room.p2.isJoined = true
                        room.p2.ws = ws
                        room.p2.ws.send(JSON.stringify({type:'init', data:data}))

                    }else{
                        data = {
                            turn:room.p1.color,
                            data:{
                                name:room.p1.name,
                                time:room.p1.time
                            },
                            posFen:room.pos,
                            lastMove:room.lastMove,
                            captures:room.captures
                        }
                        room.p1.isJoined = true
                        room.p1.ws = ws
                        room.p1.ws.send(JSON.stringify({type:'init', data:data}))

                    }
                    if(room.p1.isJoined && room.p2.isJoined){
                        if(room.p1.ws) room.p1.ws.send(JSON.stringify({type:'join', data:{
                            turn:room.p2.color,
                            data:{
                                name:room.p2.name,
                                time:room.p2.time
                            }
                        }}))
                        if(room.p2.ws) room.p2.ws.send(JSON.stringify({type:'join', data:{
                            turn:room.p1.color,
                            data:{
                                name:room.p1.name,
                                time:room.p1.time
                            }
                        }}))
                    }
                }
            }
            if(data.type === 'move'){
                const color = data.data.move['color']
                const roomId = data.data['room_id']
                if(color && roomId){
                    const room = findRoomById(roomId)
                    if(room){
                        const currentPlayer = findPlayerByColor(color, room)
                        const opponentPlayer = findPlayerByColor(color === 'w' ? 'b' : 'w', room)
                        room.pos = data.data.move['after']
                        room.captures = data.data.captures
                        room.lastMove = data.data.lastMove
                        if(room.p1.color === 'w'){
                            room.p1.time = data.data.time.w
                            room.p2.time = data.data.time.b
                        }else{
                            room.p2.time = data.data.time.w
                            room.p1.time = data.data.time.b
                        }
                        if(opponentPlayer && opponentPlayer.ws) 
                            opponentPlayer.ws.send(JSON.stringify({type:"move", data:{
                            move:data.data.move
                        }}))
                        if(currentPlayer && currentPlayer.ws) 
                            currentPlayer.ws.send(JSON.stringify({type:"validate", data:{
                            pos:room.pos
                        }}))
                    }
                }
            }
            if(data.type === 'exit'){
                const room = findRoomById(data.data['room_id'])
                if(!room) return
                if(room.p1.color === 'w'){
                    room.p1.time = data.data.time.w
                    room.p2.time = data.data.time.b
                }else{
                    room.p2.time = data.data.time.w
                    room.p1.time = data.data.time.b
                }
            }
            if(data.type === 'game-over'){
                const currenUID  = ws.uid
                const room = findRoomByUId(currenUID)
                console.log(data.finishType);
                
                if(room && room.p1.ws) room.p1.ws.send(JSON.stringify({type:'game-over', data: {
                    finishType: data.finishType
                }}))
                if(room && room.p2.ws) room.p2.ws.send(JSON.stringify({type:'game-over', data: {
                    finishType: data.finishType
                }}))
            }
        };
    });

    ws.on('close', ()=>{
        console.log("User exit -> "+ws.uid);
        const player = findPlayerById(ws.uid)
        if(!player) return
        const room = findRoomByUId(ws.uid)
        player.isJoined = false
        player.ws = null
        
        if(room.p1.isJoined){
            room.p1.ws.send(JSON.stringify({type:"exit"}))
        }else if(room.p2.isJoined){
            room.p2.ws.send(JSON.stringify({type:"exit"}))
        }else{
            removeRoomById(room.id)
            console.log("Room dismanteled "+room.id);
        }
    })
});

////////////

function findRoomById(room_id){
    return rooms.find(room => room.id === room_id);
}

function findPlayerById(targetId) {
    for (const room of rooms) {
        if (room.p1.ws && room.p1.ws.uid === targetId) {
            return room.p1; // Return p1 if it matches
        }
        if (room.p2.ws && room.p2.ws.uid === targetId) {
            return room.p2; // Return p2 if it matches
        }
    }
    return null; // Return null if no match is found
}

function findPlayerByColor(color, room) {
    if (room.p1 && room.p1.color === color) {
        return room.p1; // Return p1 if it matches
    }
    if (room.p2 && room.p2.color === color) {
        return room.p2; // Return p2 if it matches
    }
    return null; // Return null if no match is found
}

function findRoomByUId(targetId) {
    return rooms.find(room =>
        room.p1.ws && room.p1.ws.uid === targetId || room.p2.ws && room.p2.ws.uid === targetId
    );
}

function removeRoomById(roomId) {
    const index = rooms.findIndex(room => room.id === roomId);
    if (index !== -1) {
        rooms.splice(index, 1); // Remove the object at the found index
    }
    return rooms; // Return the mutated array
}
