import { convertToMMSS, pauseTimer, startTimer } from "../helper.js";
import { Chess } from "../chess.js";

const chess = new Chess();
let lastSteps = []
let isGameOver = false
let isGameStarted = true
let postGameData = {
    winner:null,
    looser:null,
    type:null
}
const sessionTime = 2
const game = {
    lastClick:{square:null,active:false},
    turn:chess.turn(),
    data:{
        w:{name:'Player-1', isCheck:false, timer:{time: sessionTime*60, interval:null}},
        b:{name:'Player-2', isCheck:false, timer:{time: sessionTime*60, interval:null}}
    },
    captures:{
        w:[],
        b:[]
    }
}

const board = Chessboard('board', {
    draggable: true, // Allow dragging of pieces
    position: 'start', // Initial position of the chessboard (standard starting position)
    pieceTheme: '/svg/{piece}.svg', // Path to chess piece images
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
});

updateDataUI(game.data, game.turn)
startTimer(game.turn, game.data, updateTimer, isGameOverStatus)

// Handle square clicks for piece details or showing hints
$('#board').on('click', '.square-55d63', function () {
    //Check game status each time for move
    if(isGameOver || !isGameStarted) return

    const square = $(this).data('square');

    //This is executed when there is click on empty squares
    if(game.lastClick.active){
        const currentMove = move(game.lastClick.square, square)
        if(currentMove) onSnapEnd()
        game.lastClick.active = false
        game.lastClick.square = null
        highlightOff()
    }
});


function onDragStart(square, piece, position, orientation) {
    //Check game status each time for move
    if(isGameOver || !isGameStarted) return

    if(piece[0] === game.turn){
        highlightOff()
        highlightOn(square)
    }
    $('body').css('cursor', 'grabbing');
}


function onDrop(square, target) {
    //release grabbing at any cost
    $('body').css('cursor', 'default');

    //Check game status each time for move
    if(isGameOver || !isGameStarted) return 'snapback'

    const sPiece = chess.get(square);

    let currentMove = null

    // consider this when you click somewhere
    if(sPiece['color'] !==  game.turn && game.lastClick.active){
        currentMove = move(game.lastClick.square, square)
        if(currentMove){
            highlightOff()
            return
        }
        return 'snapback'
    }

    if(sPiece['color'] === game.turn){
        if(game.lastClick.square !== square){
            game.lastClick.square = square
            game.lastClick.active = true
        }else{
            if(game.lastClick.active && square === target){
                game.lastClick.active = false
                highlightOff()
            }else{
                game.lastClick.active = true
                highlightOn(square)
            }
        }
    }

    //consider this when you drag and drop somewhere
    currentMove = move(square, target)

    if(!currentMove) return 'snapback'

    highlightOff()
}


  // update the board position after the piece snap
  // for castling, en passant, pawn promotion
function onSnapEnd () {
    //Check game status each time for move
    if(isGameOver || !isGameStarted) return

    // update game for every snap
    updateGame()
}

//Update game state offline
function updateGame(){
    //update board
    board.position(chess.fen())

    //stop timer for last moved color
    pauseTimer(game.turn, game.data, updateTimer)

    // checkmate and show prompt
    if(chess.isCheckmate()){
        isGameOverStatus(true, 'checkmate')
        return
    }

    // stalemate show prompt
    if(chess.isStalemate()){
        isGameOverStatus(true, 'stalemate')
        return
    }

    // draw or insufficeint pieces
    if(chess.isDraw()){
        isGameOverStatus(true, 'draw')
        return
    }
    
    //This is for check verification
    game.data[chess.turn()].isCheck = chess.isCheck()

    //If above done then safely turn board and swap turn
    game.turn = chess.turn()

    setTimeout(() => {
        board.orientation(game.turn === 'w' ? 'white' : 'black')
        updateInfo(game.data[game.turn].isCheck ? "check" : null)
        startTimer(game.turn, game.data, updateTimer, isGameOverStatus)
        showLastMove()
        updateDataUI(game.data, chess.turn())
    }, 300);
}

// -----------
// this will show last move
function showLastMove(){
    // highlight the possible squares for this piece
    $('#board .square-55d63').removeClass('last-move')
    for(const square of lastSteps){
        $('#board .square-' + square).addClass('last-move')
    }
}

// on hint
function highlightOn(square){
    let whiteSquareGrey = '#a9a9a9'
    let blackSquareGrey = '#696969'
    let background = null

    // get list of possible moves for this square
    const moves = chess.moves({square:square, verbose:true}).map(move => move.to);

    //add this square also
    moves.push(square)

    // highlight the possible squares for this piece
    for(const square of moves){
        let $square = $('#board .square-' + square)

        background = whiteSquareGrey
        if ($square.hasClass('black-3c85d')) {
            background = blackSquareGrey
        }
        $square.css('background', background)
    }
}

//off hint
function highlightOff(){
    $('#board .square-55d63').css('background', '')
}

//Move
function move(square, target) {
    const validMoves = chess.moves({ square: square, verbose: true });
    const isValidMove = validMoves.some(m => m.to === target);

    if (!isValidMove) {
        return null; // Exit early if the move is invalid
    }

    const piece = chess.get(square)?.type; // Get the piece type from the starting square
    const isWhitePawnPromotion = piece === "p" && target[1] === "8"; // White pawn reaching rank 8
    const isBlackPawnPromotion = piece === "p" && target[1] === "1"; // Black pawn reaching rank 1

    if (isWhitePawnPromotion || isBlackPawnPromotion) {
        showPromotionModal(square, target); // Show the modal and wait for user input
        return null; // Return early to wait for the modal interaction
    }

    // For regular moves, proceed directly
    const move = chess.move({
        from: square,
        to: target,
    });

    if (move && move.captured) {
        capturePiece(move.captured, move.color); // Handle captures (optional)
    }

    if(move) lastSteps = [square, target]

    return move;
}

function showPromotionModal(square, target) {
    // Show the modal using jQuery
    $(".pp-prompt").removeClass('d-none')

    // Add click handlers using jQuery for user selection
    $(".pp-piece").off("click").on("click", function () {
        const promotionPiece = $(this).data("piece"); // Get the selected piece from the button's data attribute
        promotePawn(square, target, promotionPiece);
    });
}

function promotePawn(square, target, promotionPiece) {
    // Perform the move with the selected promotion piece
    const move = chess.move({
        from: square,
        to: target,
        promotion: promotionPiece // Selected promotion piece
    });

    if (move) {
        // Hide the modal
        $(".pp-prompt").addClass('d-none')

        updateGameOffline()

        //Capture the piece here
        if (move && move.captured) {
            capturePiece(move.captured, move.color); // Handle captures (optional)
        }

        lastSteps = [square, target]
        highlightOff()
        showLastMove()

    } else {
        console.error("Failed to promote pawn!");
        return null
    }
}

//Capture for piece
function capturePiece(captured, byColor){
    let pieceColor = byColor === 'w' ? 'b' : 'w'
    let pieceType = captured
    let piecePath = `${pieceColor}${pieceType.toUpperCase()}`
    let fullScrPath = `/svg/${piecePath}.svg`
    game.captures[byColor].push(fullScrPath)
}

//showGameOverPrompt("Pavan", "Kiran")
function updatePostGameData(type){
    if(type === 'draw' || type === 'stalemate'){
        postGameData.type = type
        return
    }
    postGameData.looser = chess.turn()
    postGameData.winner = postGameData.looser === 'w' ? 'b': 'w'
    postGameData.type = type
}

//
function showGameOverPrompt(type){
    //update post game data here
    updatePostGameData(type)

    $(".home-btn").off("click").on("click", function () {
        window.location.href = '/'
        return
    });

    $(".view-board-btn").off("click").on("click", function () {
        $(".game-over-prompt").addClass('d-none')
        return
    });

    $(".game-over-prompt").removeClass('d-none')
    $('.game-over-type').text(postGameData.type)

    if(postGameData.winner && postGameData.looser){
        $('.game-winner').text(`${game.data[postGameData.winner].name} Won`)
        $('.game-looser').text(`${game.data[postGameData.looser].name} Loss`)
        return
    }
    $('.game-over-winner-container').addClass('d-none')
}

function updateInfo(message){
    if(message) $('.w-board-layout-player .board-layout-player-info').text(message)
    else $('.w-board-layout-player .board-layout-player-info').text("")
}

function updateDataUI(data, turn){
    const bottomPlayer = turn
    const topPlayer = bottomPlayer === 'w' ? 'b' : 'w'
    //Setting for white
    $('.w-board-layout-player .board-layout-player-name').text(data[bottomPlayer]['name'])
    $('.w-board-layout-player .board-layout-player-timer').text(convertToMMSS(data[bottomPlayer]['timer']['time']))

    // Clear previous captures for white
    $(".w-captures").empty();
    for(const picePath of game.captures[bottomPlayer]){
        $(".w-captures").append(`<img class="board-layout-player-capture-piece" src="${picePath}" alt="Capture Image">`);
    }

    //Setting for black
    $('.b-board-layout-player .board-layout-player-name').text(data[topPlayer]['name'])
    $('.b-board-layout-player .board-layout-player-timer').text(convertToMMSS(data[topPlayer]['timer']['time']))

    // Clear previous captures for white
    $(".b-captures").empty();
    for(const picePath of game.captures[topPlayer]){
        $(".b-captures").append(`<img class="board-layout-player-capture-piece" src="${picePath}" alt="Capture Image">`);
    }
}

function updateTimer(turn, timeValueMM){
    if(turn === chess.turn())
        $('.w-board-layout-player .board-layout-player-timer').text(timeValueMM)
    else
        $('.b-board-layout-player .board-layout-player-timer').text(timeValueMM)
}

function isGameOverStatus(status, type){
    showLastMove()
    updateDataUI(game.data, game.turn)
    showGameOverPrompt(type)
    isGameOver = status
    isGameStarted = !status
}