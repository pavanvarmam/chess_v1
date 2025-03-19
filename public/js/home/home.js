 // jQuery to handle the form submission
$(document).ready(function () {
    $("#myForm").on("submit", function (e) {
        // Prevent the default form submission
        e.preventDefault();

        // Collect data only for text inputs and checked radio buttons
        const formData = {};
        $(this).find("input[type='text'], input:checked").each(function () {
            formData[$(this).attr("name")] = $(this).val();
        });

        // Send the GET request to the backend
        $.ajax({
            url: '/create-room', // Replace with your backend URL
            type: 'GET', // Use GET method
            data: formData, // Pass the form data as an object
            success: function (response) {
                const destinationUrl = response.url
                const roomCode = response.code
                if(destinationUrl && roomCode) $(location).attr('href', destinationUrl);
            },
            error: function (error) {
                console.error("Error:", error);
                alert("Failed to send data.");
            }
        });
    });
});