// Create WebSocket connection.
const originURL = window.location.origin;
const wsURL = convertToWebSocketURL(originURL);
const socket = new WebSocket(wsURL);

// Connection opened
socket.addEventListener("open", () => {
    socket.send(JSON.stringify("Hello Server!"));
});

// Listen for messages
socket.addEventListener("message", (event) => {
    const {data} = event
    console.log("Message from server ", data);
});

//This is helper methods to manage url data
function convertToWebSocketURL(originURL) {
    // Parse the URL
    const url = new URL(originURL);

    // Change the protocol
    if (url.protocol === 'https:') {
        url.protocol = 'wss:'; // HTTPS becomes WSS
    } else if (url.protocol === 'http:') {
        url.protocol = 'ws:'; // HTTP becomes WS
    }

    return url.toString();
}