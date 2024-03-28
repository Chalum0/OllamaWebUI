const myHeaders = new Headers();
myHeaders.append("Content-Type", "text/plain");

let chatHistory = {}

let dark = true

let messages = []

const userPP = "https://th.bing.com/th/id/OIP.zc3XRPZxUt4Xt7zDZYLa_wAAAA?rs=1&pid=ImgDetMain"
const aiPP = "https://www.kunstloft.fr/wordpress/fr_FR/fr/wp-content/uploads/2023/08/a4411c44-c1cc-45ca-bf4b-2ecaf5172ba8.jpg"

function getResponseFromOllama(prompt, model) {
    // Push the new user message to the messages array
    messages.push({"role": 'user', "content": prompt}); // Fixed: use the prompt parameter instead of the string "prompt"

    const raw = JSON.stringify({
        model: model,
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
    const paragraph = createMessageElement(aiPP, model, "")
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
                        // console.log(messages); // Log messages at the end of the stream
                        // let newMSG = reverseRole(messages)
                        // console.log(newMSG)
                        // getResponseFromOllama(newMSG[newMSG.length-1].content, model)
                        // return;
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
async function getModels() {
    try {
        const response = await fetch('http://localhost:11434/api/tags', {
            method: 'GET', // Specifies the request method
            headers: {
                'Content-Type': 'application/json', // Sets the content type to JSON
                // Include additional headers if necessary
            },
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data; // Return the data collected from the API
    } catch (error) {
        console.error('There was a problem with your fetch operation:', error);
        throw error; // Optionally re-throw the error if you want to handle it outside
    }
}
function toggleOptions() {
    document.querySelector('.options').classList.toggle('show');
}
function selectOption(value) {
    document.querySelector('#model').textContent = value;
    toggleOptions();
}
function hideModelList(){
    var dropdowns = document.getElementsByClassName("options");
    for (var i = 0; i < dropdowns.length; i++) {
        var openDropdown = dropdowns[i];
        if (openDropdown.classList.contains('show')) {
            openDropdown.classList.remove('show');
        }
    }
}
function removeLatest(string) {
    return string.substring(0, string.length - 7);
}
function reverseRole(msgList){
    let msgLST = []
    for (let i = 0; i < msgList.length; i++){
        if (msgList[i].role === "user"){
            msgLST.push({"role": "assistant", "content": msgList[i].content})
        }
        if (msgList[i].role === "assistant"){
            msgLST.push({"role": "user", "content": msgList[i].content})
        }

    }
    return msgLST
}
function setDarkMode(darkMode){
    // Selects all elements in the document
    const elements = document.querySelectorAll('*');

    // Loops through each element
    elements.forEach(element => {
        // If darkMode is false, add the 'light' class, otherwise remove it
        if (!darkMode) {
            element.classList.add('light');
        } else {
            element.classList.remove('light');
        }
    });
}

function listModels(){
    getModels().then(data => {
        // console.log(data.models)
        let models = data.models
        selectOption(removeLatest(models[0].name))
        for (let i = 0; i < models.length ; i++) {
            let listElement = document.createElement("li")
            listElement.textContent = removeLatest(models[i].name)
            if (!dark){
                listElement.classList.add("light")
            }
            document.querySelector(".options").appendChild(listElement)
            let name = removeLatest(models[i].name)
            listElement.addEventListener('click', () => {
                selectOption(name)
            })
        }
        hideModelList()
    })
}

document.querySelector("#messageBox").addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        document.querySelector("#welcomeMessageBox").style.display = "none"
        getResponseFromOllama(document.querySelector("#messageBox").value, document.querySelector("#model").textContent)
        document.querySelector("#messageBox").value = ""
    }
})
// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
    if (!event.target.matches('.selected-option')) {
        hideModelList()
    }
}
window.addEventListener('keydown', function(event) {
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
        return;
    }
    document.querySelector("#messageBox").focus()
});

listModels()
setDarkMode(dark)
