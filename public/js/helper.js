export function convertToMMSS(seconds) {
    // Calculate minutes and remaining seconds
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    // Format with leading zeros if necessary
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");

    // Return the formatted string
    return `${formattedMinutes}:${formattedSeconds}`;
}

export function startTimer(turn, data, updateTimer, isGameOverStatus){
    const timer = data[turn]['timer'];

    if (!timer.interval) {
        timer.interval = setInterval(() => {
        timer.time--;
        updateTimer(turn, convertToMMSS(timer.time))


        if (timer.time <= 0) {
            clearInterval(timer.interval);
            timer.interval = null; // Clear the interval
            console.log(`${turn} loss of timeout`);
            isGameOverStatus(true, 'time-out')
        }
        }, 1000);
    }
}

export function pauseTimer(turn, data, updateTimer){
    const timer = data[turn]['timer'];
    if (timer.interval) {
        clearInterval(timer.interval);
        timer.interval = null;
        updateTimer(turn, convertToMMSS(timer.time))
    }
}