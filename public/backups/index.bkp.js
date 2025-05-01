// Importing chess.js library
import { Chess } from '/chess.js';

const settings = {
    notation: 'outside',
    highlightSquare: true,
    highlightLegalMoves: true
};
const game = new Chess();
//'rnbq2nr/pppkpP1p/8/3p2p1/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1'
const state = {
    turn : 'w',
    history: [],
    currentMoveOnBoard: null
}
const player = {
    w:'Kiran',
    b:'Pavan'
}

// Create a new Audio object
const sounds = {
    capture : new Audio('/sounds/capture.mp3'),
    castle: new Audio('/sounds/castle.mp3'),
    game_end: new Audio('/sounds/game-end.mp3'),
    move_check: new Audio('/sounds/move-check.mp3'),
    move_opponent: new Audio('/sounds/move-opponent.mp3'),
    move_self: new Audio('/sounds/move-self.mp3'),
    promote: new Audio('/sounds/promote.mp3'),
    illegal: new Audio('/sounds/illegal.mp3')
}

$(document).ready(function () {
    initBoard();

    let isDragging = false;
    let $piece = null; // use this variable to update pieces in drag and drop only
    let $hoverSquare = $('.hover-square'); // use this variable to update pieces in drag and drop only
    let hoverSquare;
    let fromSquare, toSquare;
    let highlightedSquare;

    // Handle mouse down event
    $('#board').on("mousedown", function (e) {
        e.preventDefault();
        if(game.isGameOver()) return;
        if(state.currentMoveOnBoard && state.currentMoveOnBoard['after'] !== game.fen()) return;
        $piece = $(e.target).hasClass('piece') ? $(e.target) : null;
        hoverSquare = getSquareFromTouch(e);
        fromSquare = hoverSquare;
        if ($piece) {
            highlightClick();
            if (movePiece(highlightedSquare, fromSquare)) {
                highlightedSquare = null;
                clearHints();
                removeHighlightClick();
            } else {
                startDragging(e);
            }
        } else {
            handleMoveAttempt();
        }
    });

    // Handle mouse move event
    $(document).on("mousemove", function (e) {
        if (!isDragging) return;
        updatePiecePosition(e);
        let newHoverSquare = getSquareFromTouch(e);
        if (hoverSquare !== newHoverSquare) {
            hoverSquare = newHoverSquare;
            updateHoverSquare();
        }
    });

    // Handle mouse up event
    $(document).on("mouseup", function (e) {
        if (!$piece) return;
        toSquare = getSquareFromTouch(e);
        if (toSquare === fromSquare) {
            handleSameSquareDrop();
        } else {
            handleDragDrop();
        }
        endDragging();
    });

    // Helper function to clear hints
    function clearHints() {
        $(".hint").remove();
        $(".capture-hint").remove();
    }

    // Helper function to add hints based on valid moves and other options
    function showHints() {
        if(!settings.highlightLegalMoves) return;
        if(game.turn() !== state.turn) return;
        const $board = $("#board");
        clearHints();
        game.moves({ square:fromSquare, verbose: true }).forEach(square => {
            let hintClass = square['captured'] && square['flags'] !== 'e'? 'capture-hint' : 'hint';
            if(square['promotion'] === 'q') 
                $board.append(`<div class="${hintClass} square-${square['to']}"></div>`);
            else if(!square['promotion'])
                $board.append(`<div class="${hintClass} square-${square['to']}"></div>`);
        });
    }

    //Hover sqaure
    function updateHoverSquare(){
        $hoverSquare.removeClass().addClass(`hover-square square-${hoverSquare}`);
        $hoverSquare.css({'visibility':'', 'background-color':'', 'opacity':''});
    }

    //remove highlight click
    function removeHighlightClick(){
        $('[data-test-element="highlight"]').first().removeClass().addClass('element-pool').removeAttr('style');
    }

    //highlight clicked square
    function highlightClick(){
        if(!settings.highlightSquare) return;
        $('[data-test-element="highlight"]').first().removeClass().addClass(`highlight square-${fromSquare}`)
        .css({'background-color': 'rgb(244, 234, 17)', 'opacity': '0.5'});
    }

    //hightlight moves
    function highlightMoves(from, to){
        if(!settings.highlightSquare) return;
        $('[data-test-element="highlight"]').eq(1).removeClass().addClass(`highlight square-${from}`)
        .css({'background-color': 'rgb(244, 234, 17)', 'opacity': '0.5'});
        $('[data-test-element="highlight"]').eq(2).removeClass().addClass(`highlight square-${to}`)
        .css({'background-color': 'rgb(244, 234, 17)', 'opacity': '0.5'});
    }

    //blink light when check but invalid move
    function addBlinkingSquare() {
        let $square = $('<div>', {
            class: `highlight square-${getKingSquare(game.turn())}`, // Uses existing styles including width, height, position
            css: { 'background-color': 'rgb(255, 0, 0)', 'opacity': '0' } // Initially hidden
        }).appendTo('#board');
    
        let blinkCount = 0;
        let maxBlinks = 3; // Blink 3 times
    
        let blinkInterval = setInterval(() => {
            $square.fadeTo(150, 1).fadeTo(150, 0, function () {
                blinkCount++;
                if (blinkCount >= maxBlinks) {
                    clearInterval(blinkInterval); // Stop blinking after 3 times
                    $square.remove(); // Remove the element after blinking
                }
            });
        }, 300);
    }

    // Start dragging a piece
    function startDragging(e) {
        isDragging = true;
        updatePiecePosition(e);
        updateHoverSquare();
        showHints();
    }

    // Handle move attempt when clicking on an empty square
    function handleMoveAttempt() {
        movePiece(highlightedSquare, fromSquare)
        highlightedSquare = null;
        clearHints();
        removeHighlightClick();
    }

    // Handle dropping the piece on the same square
    function handleSameSquareDrop() {
        if (highlightedSquare === toSquare) {
            highlightedSquare = null;
            clearHints();
            removeHighlightClick();
        } else {
            highlightedSquare = fromSquare;
        }
    }

    // Handle drag-and-drop movement
    function handleDragDrop() {
        if (movePiece(fromSquare, toSquare, 'drag-drop')) {
            highlightedSquare = null;
            clearHints();
            removeHighlightClick();
        } else {
            highlightedSquare = fromSquare;
            if(game.isCheck()){
                addBlinkingSquare();
                sounds['illegal'].play().catch(error => {
                    console.error('Error playing sound:', error);
                });
            }
        }
    }

    // End the dragging process
    function endDragging() {
        isDragging = false;
        $hoverSquare.css('visibility', 'hidden');
        $piece.removeClass('dragging');
        $piece.css("transform", "");
        $piece = null;
    }

    ////Other methods

    function initBoard() {
        resizeBoard();
        $(window).resize(resizeBoard);
        initPosition(game.fen());
    }
    
    function resizeBoard() {
        const maxHeight = $(window).height() * 0.75;
        const viewportWidth = $(window).width() * 0.9;
        let newSize = Math.min(viewportWidth, maxHeight);

        // Ensure minimum size of 300px
        newSize = Math.max(newSize, 300);

        // Update the custom property using jQuery
        $('body').css('--boardWidth', newSize + 'px');
    }
    
    function setNotation(notation) {
        const $board = $('#board');
        const isWhiteOrientation = state.turn === 'w'
        $('.coordinates').remove();
        const coordinatesSVG = getNotationSVG(notation, isWhiteOrientation);
        $board.append(coordinatesSVG);
    }
    
    function getNotationSVG(notation, isWhiteOrientation) {
        if (notation === 'outside') {
            return isWhiteOrientation ? `<svg viewBox="0 0 100 100" class="coordinates outside"><text x="2" y="3.5" font-size="3.1" class="coordinate-grey">8</text><text x="2" y="16" font-size="3.1" class="coordinate-grey">7</text><text x="2" y="28.5" font-size="3.1" class="coordinate-grey">6</text><text x="2" y="41" font-size="3.1" class="coordinate-grey">5</text><text x="2" y="53.5" font-size="3.1" class="coordinate-grey">4</text><text x="2" y="66" font-size="3.1" class="coordinate-grey">3</text><text x="2" y="78.5" font-size="3.1" class="coordinate-grey">2</text><text x="2" y="91" font-size="3.1" class="coordinate-grey">1</text><text x="10.35" y="99.25" font-size="3.1" class="coordinate-grey">a</text><text x="22.85" y="99.25" font-size="3.1" class="coordinate-grey">b</text><text x="35.35" y="99.25" font-size="3.1" class="coordinate-grey">c</text><text x="47.85" y="99.25" font-size="3.1" class="coordinate-grey">d</text><text x="60.35" y="99.25" font-size="3.1" class="coordinate-grey">e</text><text x="72.85" y="99.25" font-size="3.1" class="coordinate-grey">f</text><text x="85.35" y="99.25" font-size="3.1" class="coordinate-grey">g</text><text x="97.85" y="99.25" font-size="3.1" class="coordinate-grey">h</text></svg>` 
            : `<svg viewBox="0 0 100 100" class="coordinates outside"><text x="2" y="3.5" font-size="3.1" class="coordinate-grey">1</text><text x="2" y="16" font-size="3.1" class="coordinate-grey">2</text><text x="2" y="28.5" font-size="3.1" class="coordinate-grey">3</text><text x="2" y="41" font-size="3.1" class="coordinate-grey">4</text><text x="2" y="53.5" font-size="3.1" class="coordinate-grey">5</text><text x="2" y="66" font-size="3.1" class="coordinate-grey">6</text><text x="2" y="78.5" font-size="3.1" class="coordinate-grey">7</text><text x="2" y="91" font-size="3.1" class="coordinate-grey">8</text><text x="10.35" y="99.25" font-size="3.1" class="coordinate-grey">h</text><text x="22.85" y="99.25" font-size="3.1" class="coordinate-grey">g</text><text x="35.35" y="99.25" font-size="3.1" class="coordinate-grey">f</text><text x="47.85" y="99.25" font-size="3.1" class="coordinate-grey">e</text><text x="60.35" y="99.25" font-size="3.1" class="coordinate-grey">d</text><text x="72.85" y="99.25" font-size="3.1" class="coordinate-grey">c</text><text x="85.35" y="99.25" font-size="3.1" class="coordinate-grey">b</text><text x="97.85" y="99.25" font-size="3.1" class="coordinate-grey">a</text></svg>`;
        } else if (notation === 'inside') {
            return isWhiteOrientation ? `<svg viewBox="0 0 100 100" class="coordinates"><text x="2" y="3.5" font-size="3.1" class="coordinate-light">8</text><text x="2" y="16" font-size="3.1" class="coordinate-dark">7</text><text x="2" y="28.5" font-size="3.1" class="coordinate-light">6</text><text x="2" y="41" font-size="3.1" class="coordinate-dark">5</text><text x="2" y="53.5" font-size="3.1" class="coordinate-light">4</text><text x="2" y="66" font-size="3.1" class="coordinate-dark">3</text><text x="2" y="78.5" font-size="3.1" class="coordinate-light">2</text><text x="2" y="91" font-size="3.1" class="coordinate-dark">1</text><text x="10.35" y="99.25" font-size="3.1" class="coordinate-dark">a</text><text x="22.85" y="99.25" font-size="3.1" class="coordinate-light">b</text><text x="35.35" y="99.25" font-size="3.1" class="coordinate-dark">c</text><text x="47.85" y="99.25" font-size="3.1" class="coordinate-light">d</text><text x="60.35" y="99.25" font-size="3.1" class="coordinate-dark">e</text><text x="72.85" y="99.25" font-size="3.1" class="coordinate-light">f</text><text x="85.35" y="99.25" font-size="3.1" class="coordinate-dark">g</text><text x="97.85" y="99.25" font-size="3.1" class="coordinate-light">h</text></svg>` 
            : `<svg viewBox="0 0 100 100" class="coordinates"><text x="2" y="3.5" font-size="3.1" class="coordinate-light">1</text><text x="2" y="16" font-size="3.1" class="coordinate-dark">2</text><text x="2" y="28.5" font-size="3.1" class="coordinate-light">3</text><text x="2" y="41" font-size="3.1" class="coordinate-dark">4</text><text x="2" y="53.5" font-size="3.1" class="coordinate-light">5</text><text x="2" y="66" font-size="3.1" class="coordinate-dark">6</text><text x="2" y="78.5" font-size="3.1" class="coordinate-light">7</text><text x="2" y="91" font-size="3.1" class="coordinate-dark">8</text><text x="10.35" y="99.25" font-size="3.1" class="coordinate-dark">h</text><text x="22.85" y="99.25" font-size="3.1" class="coordinate-light">g</text><text x="35.35" y="99.25" font-size="3.1" class="coordinate-dark">f</text><text x="47.85" y="99.25" font-size="3.1" class="coordinate-light">e</text><text x="60.35" y="99.25" font-size="3.1" class="coordinate-dark">d</text><text x="72.85" y="99.25" font-size="3.1" class="coordinate-light">c</text><text x="85.35" y="99.25" font-size="3.1" class="coordinate-dark">b</text><text x="97.85" y="99.25" font-size="3.1" class="coordinate-light">a</text></svg>`;
        }
        return '';
    }
    
    function mapPositionToPieces(fen) {
        const boardRows = fen.split('/');
        const positionToPieces = {};
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    
        boardRows.forEach((row, rowIndex) => {
            let fileIndex = 0;
            for (let char of row) {
                if (isNaN(char)) {
                    const square = files[fileIndex] + (8 - rowIndex);
                    positionToPieces[square] = (char === char.toUpperCase() ? 'w' : 'b') + char.toLowerCase();
                    fileIndex++;
                } else {
                    fileIndex += parseInt(char);
                }
            }
        });
    
        return positionToPieces;
    }
    
    function initPosition(fen) {
        const positionToPieces = mapPositionToPieces(getPositionFromFen(fen));
        const $board = $("#board");
        $board.html("");
        $board.append(`
            <div class="hover-square" style="visibility: hidden;">
                <svg viewBox="0 0 100 100">
                    <rect x="0" y="0" width="100" height="100" stroke="rgba(255, 255, 255, 0.65)" stroke-width="10" fill="none"></rect>
                </svg>
            </div>
            `)
        $board.append(`
            <div class="element-pool" data-test-element="highlight" style=""></div>
            <div class="element-pool" data-test-element="highlight" style=""></div>
            <div class="element-pool" data-test-element="highlight" style=""></div>
            `)
    
        for (const pos in positionToPieces) {
            const piece = positionToPieces[pos];
    
            $board.append(
                `<div class="piece ${piece} square-${pos}" style=""></div>`
            );
        }
        orientation();
    }
    
    function orientation(){
        if(game.isGameOver()) return;
        const turn = state.turn;
        const $board = $("#board");
        if(turn === 'w') $board.removeClass("flipped");
        if(turn === 'b') $board.addClass("flipped");
        setNotation(settings.notation);
    }
    
    // Move a piece on the board
    function movePiece(from, to, method) {
        let movement = move(from, to)
        if (!movement) return;
        update(movement, state.currentMoveOnBoard && state.currentMoveOnBoard['after'] || movement['before'], movement['after'], method);
        highlightMoves(from, to);
        gameUpdate(movement);
        return true;
    }
    
    function move(from, to){
        if(game.turn() !== state.turn) return null;
        try{
            return game.move({ from:from, to:to, promotion:'q' , verbose:true});
        }catch(e){
            return null;
        }
    }
    
    function getPositionFromFen(fen) {
        // The position part is the first segment of the FEN string before the first space
        return fen.split(" ")[0];
    }
    
    // Animate the board changes
    function update(movement, before, after, method, shouldAnimate) {
        const isCastling = movement['san'] === 'O-O-O' || movement['san'] === 'O-O';
        const isPromotion = movement['promotion'];
        
        const prevFen = getPositionFromFen(before);
        const newFen = getPositionFromFen(after);
        const {moves, removes, adds} = comparePositionsTest(prevFen, newFen);

        console.log(moves);
        console.log(removes);
        console.log(adds);

        if(method === 'update'){
            if(shouldAnimate){
                for (const position of moves) {
                    movePieceAnimate(position, true);
                }
            }else{
                if(removes.length) removePieceFromBoard();
                if(adds.length) addPieceToBoard();
                for (const position of moves) {
                    movePieceAnimate(position);
                }
            }
            return
        }
        
        // This block for only pawn promotion
        if(isPromotion){
            if(removes.length) removePieceFromBoard();
            if(adds.length) addPieceToBoard();
            return;
        }

        for (const position of moves) {
            if(method === 'drag-drop'){
                // This block for only casling for rook animation
                if(isCastling && moves.length === 2){
                    handleCastlingMove(moves)
                    return;
                }
                if(removes.length) removePieceFromBoard();
                if(adds.length) addPieceToBoard();
                movePieceAnimate(position);
            }else{
                movePieceAnimate(position, true);
            }
        }

        function handleCastlingMove(moves){
            if(moves[0]['piece'][1] === 'k'){
                movePieceAnimate(moves[0]);
                movePieceAnimate(moves[1], true);
            }else{
                movePieceAnimate(moves[1]);
                movePieceAnimate(moves[0], true);
            }
        }

        function addPieceToBoard(){
            let $elementPools = $('.element-pool').filter(function() {
                return Object.keys(this.dataset).length === 0;
            });

            for (let i = 0; i < adds.length; i++) {
                if ($elementPools.length > i) {
                    // If there's an available element, reuse it
                    $elementPools.eq(i).removeClass().addClass(`piece ${adds[i]['piece']} square-${adds[i]['square']}`);
                } else {
                    // Otherwise, create a new element and append it to the board
                    let newElement = $('<div></div>')
                        .addClass(`piece ${adds[i]['piece']} square-${adds[i]['square']}`);
                    
                    $('#board').append(newElement);
                }
            }
        }

        function removePieceFromBoard(){
            for (const position of removes) {
                const $elementToRemove = $(`.piece.square-${position['square']}`)
                $elementToRemove.removeClass().addClass('element-pool');
            }
        }

        function movePieceAnimate(position, animation) {
            const $piece = $(`.square-${position['from']}.${position['piece']}`);
        
            // Select only the piece at 'to' square that is NOT the piece being moved
            const $eleminatedPiece = $(`.square-${position['to']}.piece`).not($piece);
        
            if (animation) {
                $piece.css({ 'transition': 'transform 0.2s ease-out', 'z-index': '1000' });
                $piece.removeClass().addClass(`piece ${position['piece']} square-${position['to']}`);
        
                $piece.one('transitionend webkitTransitionEnd oTransitionEnd', function () {
                    // Remove only the originally present piece
                    if ($eleminatedPiece.length) {
                        $eleminatedPiece.removeClass().addClass('element-pool');
                    }else{
                        if(removes.length) removePieceFromBoard();
                        if(adds.length) addPieceToBoard();
                    }
                    $(this).css({ 'transition': '', 'z-index': '' });
                });
            } else{
                $piece.removeClass().addClass(`piece ${position['piece']} square-${position['to']}`);
            }
        }
    }
    
    // get square from touch
    function getSquareFromTouch(event) {
        const $board = $("#board");
        if (!$board) return;
        
        const boardOffset = $board.offset(); // Get board's position
        const boardSize = $board.width(); // Assuming square board
        const squareSize = boardSize / 8; // Each square's size
        const isFlipped = $board.hasClass('flipped'); // Check orientation
    
        // Get mouse position relative to board
        let x = event.pageX - boardOffset.left;
        let y = event.pageY - boardOffset.top;
    
        // Convert mouse position to square indices (but clamp them within valid range)
        let fileIndex = Math.floor(Math.max(0, Math.min(boardSize - 1, x)) / squareSize);
        let rankIndex = Math.floor(Math.max(0, Math.min(boardSize - 1, y)) / squareSize);
    
        // Adjust indices if board is flipped
        if (isFlipped) {
            fileIndex = 7 - fileIndex;
            rankIndex = 7 - rankIndex;
        }
    
        // Convert to chess notation
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const square = files[fileIndex] + (8 - rankIndex);
    
        return square;
    }
    
    //updates piece postion repective to mouse position
    function updatePiecePosition(e) {
        const $board = $("#board");
        let pieceRect = $piece[0].getBoundingClientRect();
        let boardRect = $board[0].getBoundingClientRect();
    
        let pieceWidth = pieceRect.width;
        let pieceHeight = pieceRect.height;
    
        // Adjusted clamping before converting to percentage
        let x = Math.max(0 - pieceWidth/2, Math.min(boardRect.width - pieceWidth + pieceWidth/2, e.clientX - boardRect.left - pieceWidth/2));
        let y = Math.max(0 - pieceHeight/2, Math.min(boardRect.height - pieceHeight + pieceHeight/2, e.clientY - boardRect.top - pieceHeight/2));
    
        // Convert to percentage
        let xPercent = (x / boardRect.width) * 800;
        let yPercent = (y / boardRect.height) * 800;
    
        $piece.addClass('dragging');
        $piece.css("transform", `translate(${xPercent}%, ${yPercent}%) ${$piece.hasClass('rotate')?'rotate(180deg)':''}`);
    }

    function _turn(){
        return game.turn() === 'w' ? 'b' : 'w';
    }

    //gets kings square from color or turn
    function getKingSquare(color) {
        let board = game.board(); // Get current board state
    
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                let piece = board[row][col]; // Get piece at current position
                if (piece && piece.type === 'k' && piece.color === color) {
                    return String.fromCharCode(97 + col) + (8 - row); // Convert to chess notation
                }
            }
        }
        return null; // Should never happen in a valid game
    }

    //Get message too display on game over screen
    function getGameOverStatus(){
        if(game.isCheckmate()) return {header:`${player[_turn()]} WON`, sub_header:'by Checkmate'};
        else if(game.isStalemate()) return {header:'Draw', sub_header:'by stalemate'};
        else if(game.isThreefoldRepetition()) return {header:'Draw', sub_header:'by repetition'};
        else if(game.isInsufficientMaterial()) return {header:'Draw', sub_header:'by insufficient material'};
        else if(game.isDrawByFiftyMoves()) return {header:'Draw', sub_header:'by fifty moves'};
        else if(game.isDraw()) return {header:'Draw', sub_header:null};
        else return {header:`${player[_turn()]} WON`, sub_header:'by Gameover'};
    }

    //This show promt when game is finished
    function setGameOverStatus(status, message){
        const $container = $('.game-over-container')
        if(status){
            $container.show();
            $('.game-over-container .header').text(message['header'])
            $('.game-over-container .sub-header').text(message['sub_header'])
            $('.game-over-container .game-over-player-title').text(`${player['w']} vs ${player['b']}`)
            $('.game-over-container .view-board-btn').on('click', function(){
                setGameOverStatus(false);
            });
        }
        else $container.hide();
    }

    //play sound on every update of piece
    function updateSoundMovement(movement){
        if(movement.isGameOver){
            sounds['game_end'].play().catch(error => {
                console.error('Error playing sound:', error);
            });
        }else if(movement.isCheck){
            sounds['move_check'].play().catch(error => {
                console.error('Error playing sound:', error);
            });
        }else if(movement['captured']){
            sounds['capture'].play().catch(error => {
                console.error('Error playing sound:', error);
            });
        }else if(movement['promotion']){
            sounds['promote'].play().catch(error => {
                console.error('Error playing sound:', error);
            });
        }else if(movement['san'] === 'O-O' || movement['san'] === 'O-O-O'){
            sounds['castle'].play().catch(error => {
                console.error('Error playing sound:', error);
            });
        }else if(movement){
            sounds['move_self'].play().catch(error => {
                console.error('Error playing sound:', error);
            });
        }
    }

    //This method updates move history and push to state
    function updateMovesHistory(movement){
        state.history.push(movement);
        const historyLen = state.history.length;
        const $scrollContainer = $('#moves-scroll-container');
        let $moveListRow = null;
        const rowNumber = Math.ceil((historyLen)/2);
        $('.node .selected').removeClass('selected');

        if(historyLen % 2 === 0){
            const $blackMoveElement = $(`<div class="node black-move" data-node="${historyLen-1}"><span class="node-highlight-content selected">${movement['san']}</span></div>`);
            $blackMoveElement.on('click', function(event) {
                onMoveHistoryClick($(this).data('node'));
            });
            $moveListRow = $(`[data-move-number="${rowNumber}"]`).append($blackMoveElement);
        }else{
            const $whiteMoveElement = $(`<div class="node white-move" data-node="${historyLen-1}"><span class="node-highlight-content selected">${movement['san']}</span></div>`)
            $moveListRow = $(`<div class="move-list-row text-light" data-move-number="${rowNumber}"></div>`)
            $moveListRow.append(`<div class="node move-number">${rowNumber}.</div>`);
            $whiteMoveElement.on('click', function(event) {
                onMoveHistoryClick($(this).data('node'));
            });
            $moveListRow.append($whiteMoveElement)
            $scrollContainer.append($moveListRow);
        }
    }

    //Move history click
    function onMoveHistoryClick(nodeIndex){
        const movement = state.history[nodeIndex];
        
        if(Math.abs(movement['id'] - state.currentMoveOnBoard['id']) === 1)
            update(movement, state.currentMoveOnBoard['after'], movement['after'], 'update', true);
        else
            update(movement, state.currentMoveOnBoard['after'], movement['after'], 'update');
        
        $('.node .selected').removeClass('selected');
        $(`.node[data-node='${nodeIndex}']`).each(function() {
            $(this).find(".node-highlight-content").addClass("selected");
        });
        state.currentMoveOnBoard = movement;
        updateSoundMovement(movement);
        highlightMoves(movement['from'], movement['to']);
    }

    // Compare two positions (parsed from FEN) to detect changes
    function comparePositionsTest(prevFen, newFen) {
        const changes = [];
        const fen1Chnages = []
        const fen2Chnages = []
    
        const prevPosition = mapPositionToPieces(prevFen);
        const newPosition = mapPositionToPieces(newFen);

        for (const square in prevPosition) {
            if (Object.prototype.hasOwnProperty.call(prevPosition, square)) {
                if(newPosition[square] !== prevPosition[square]){
                    fen1Chnages.push({piece:prevPosition[square], square:square});
                }
            }
        }

        for (const square in newPosition) {
            if (Object.prototype.hasOwnProperty.call(newPosition, square)) {
                if(newPosition[square] !== prevPosition[square]){
                    fen2Chnages.push({piece:newPosition[square], square:square});
                }
            }
        }

        for (let i = fen1Chnages.length - 1; i >= 0; i--) {
            for (let j = fen2Chnages.length - 1; j >= 0; j--) {
                if (fen1Chnages[i]['piece'] === fen2Chnages[j]['piece']) {
                    changes.push({
                        from: fen1Chnages[i]['square'],
                        to: fen2Chnages[j]['square'],
                        piece: fen1Chnages[i]['piece'] || fen2Chnages[j]['piece']
                    });
        
                    // Remove the matched elements from both arrays
                    fen1Chnages.splice(i, 1);
                    fen2Chnages.splice(j, 1);
                    break; // Exit inner loop once a match is found
                }
            }
        }
        return {moves: changes, removes: fen1Chnages, adds: fen2Chnages}

    }

    function gameUpdate(movement){
        const currentState = {...movement, isCheck:game.isCheck(), isGameOver:game.isGameOver(), id:state.history.length}
        state.currentMoveOnBoard = currentState;
        updateMovesHistory(currentState);
        updateSoundMovement(currentState);
        state.turn = game.turn();
        if(game.isGameOver()){
            setGameOverStatus(true, getGameOverStatus());
            return;
        }
    }
});