const myHeaders = new Headers();
myHeaders.append("Content-Type", "text/plain");

let chatHistory = {}

// let messages = []

let userPP = "https://files.oaiusercontent.com/file-72BLbL8DRxnbJGWA8QiZ02Gf?se=2024-03-27T21%3A00%3A08Z&sp=r&sv=2021-08-06&sr=b&rscc=max-age%3D31536000%2C%20immutable&rscd=attachment%3B%20filename%3Dbcb991d8-5de8-41a7-810e-8be347fdd5bd.webp&sig=PsQ9qOdHYST5d0deJ1QNJifsdCdZuUCHv07Q8370Ko0%3D"
let aiPP = "https://www.kunstloft.fr/wordpress/fr_FR/fr/wp-content/uploads/2023/08/a4411c44-c1cc-45ca-bf4b-2ecaf5172ba8.jpg"

function getResponseFromOllama(prompt) {
    // Push the new user message to the messages array
    messages.push({"role": 'user', "content": prompt}); // Fixed: use the prompt parameter instead of the string "prompt"

    const raw = JSON.stringify({
        model: "llama2-uncensored",
        messages: messages, // Fixed: Changed from `templates` to `messages` as per the API documentation
        stream: true
    });

    const requestOptions = {
        method: "POST",
        headers: {"Content-Type": "application/json"}, // Ensure you have the correct headers
        body: raw,
        redirect: "follow"
    };

    createMessageElement(userPP, "You", prompt)
    const paragraph = createMessageElement(aiPP, "llama2-uncensored", "")
    const chatBoxesContainer = document.getElementById('chatBoxesContainer');
    chatBoxesContainer.scrollTop = chatBoxesContainer.scrollHeight;


    let chat = "";

    fetch("http://localhost:11434/api/chat", requestOptions)
        .then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            function read() {
                reader.read().then(({done, value}) => {
                    if (done) {
                        console.log('Stream finished.');
                        messages.push({"role": "assistant", "content": chat}); // Append the accumulated response once done
                        console.log(messages); // Log messages at the end of the stream
                        return;
                    }

                    // Decode and process the chunk
                    const chunk = decoder.decode(value, {stream: true});
                    const ck = JSON.parse(chunk);
                    console.log(ck.message); // Log each message chunk

                    // Accumulate the response
                    if (ck.message && ck.message.content) {
                        chat += ck.message.content; // Accumulate the response content
                        paragraph.textContent = chat; // Update the DOM element with the current chat content
                        const chatBoxesContainer = document.getElementById('chatBoxesContainer');
                        chatBoxesContainer.scrollTop = chatBoxesContainer.scrollHeight;
                    }

                    // Continue reading
                    read();
                }).catch(error => {
                    console.error('Stream reading failed:', error);
                });
            }

            read();
        })
        .catch(error => console.error('Fetch error:', error));
}

function createMessageElement(imageUrl, userName, messageText) {
    // Create messageContainer div
    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer';

    // Create userProfilePicture div
    const userProfilePicture = document.createElement('div');
    userProfilePicture.className = 'userProfilePicture';

    // Create img element for profile picture
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'ai image';

    // Append img to userProfilePicture
    userProfilePicture.appendChild(img);

    // Create messageBox div
    const messageBox = document.createElement('div');
    messageBox.className = 'messageBox';

    // Create userName div
    const userNameDiv = document.createElement('div');
    userNameDiv.className = 'userName';
    userNameDiv.textContent = userName; // Add userName text

    // Create message div
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    // Create paragraph for message
    const messageParagraph = document.createElement('p');
    messageParagraph.textContent = messageText; // Add message text

    // Append messageParagraph to messageDiv
    messageDiv.appendChild(messageParagraph);

    // Append userNameDiv and messageDiv to messageBox
    messageBox.appendChild(userNameDiv);
    messageBox.appendChild(messageDiv);

    // Append userProfilePicture and messageBox to messageContainer
    messageContainer.appendChild(userProfilePicture);
    messageContainer.appendChild(messageBox);

    // Finally, append messageContainer to chatBoxesContainer
    document.getElementById('chatBoxesContainer').appendChild(messageContainer);
    return messageParagraph
}

function getModels(){

    fetch('http://localhost:11434/api/tags', {
        method: 'GET', // Specifies the request method
        headers: {
            'Content-Type': 'application/json', // Sets the content type to JSON
            // Include additional headers if necessary
        },
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Parses the JSON response
        })
        .then(data => {
            console.log(data); // Handles the data from the response
        })
        .catch(error => {
            console.error('There was a problem with your fetch operation:', error);
        });

}

document.querySelector("#messageBox").addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        document.querySelector("#welcomeMessageBox").style.display = "none"
        getResponseFromOllama(document.querySelector("#messageBox").value)
        document.querySelector("#messageBox").value = ""
    }
})

