const myHeaders = new Headers();
myHeaders.append("Content-Type", "text/plain");

let chatHistory = {}

let chatID = 0
let chatData = {}
let title = "New Chat"

let messages = []

const userPP = "https://th.bing.com/th/id/OIP.zc3XRPZxUt4Xt7zDZYLa_wAAAA?rs=1&pid=ImgDetMain"
const aiPP = "https://www.kunstloft.fr/wordpress/fr_FR/fr/wp-content/uploads/2023/08/a4411c44-c1cc-45ca-bf4b-2ecaf5172ba8.jpg"

function saveOrUpdateDataInIndexedDB(data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('myDatabase', 1);

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('jsonData')) {
                db.createObjectStore('jsonData', { keyPath: 'id' });
            }
        };

        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['jsonData'], 'readwrite');
            const objectStore = transaction.objectStore('jsonData');
            const putRequest = objectStore.put({ id: 'ollamaWebUIChatHistory', data: data });

            putRequest.onsuccess = function() {
                resolve('Data saved/updated successfully.');
            };

            putRequest.onerror = function(event) {
                reject('Failed to save/update data:', event.target.error);
            };
        };

        request.onerror = function(event) {
            reject('Database error:', event.target.error);
        };
    });
}
function loadDataFromIndexedDB() {
    const request = indexedDB.open('myDatabase', 1);

    request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(['jsonData']);
        const objectStore = transaction.objectStore('jsonData');
        const getRequest = objectStore.get('ollamaWebUIChatHistory'); // Use the same key as when you saved it

        getRequest.onsuccess = function(event) {
            const data = event.target.result.data; // Here's your data
            setChatData(data)
            // Use the data as needed in your application
        };
    };

    request.onerror = function(event) {
        console.error('Database error: ', event.target.error);
    };
}
function setChatData(data){
    chatData = data
    console.log(chatData)
    newChat()
}
function newChat(){
    chatID = Object.keys(chatData).length
    // chatData[chatID] = []
    messages = []
    title = "New chat"
    // saveDataToIndexedDB(chatData)
    removeElementsByClass("messageContainer")
    displayAllChats()
}
function displayAllChats(){
    const myListElement = document.querySelector("#chatList")
    removeAllChildren(myListElement)

    for (const [key, value] of Object.entries(chatData)) {
        // console.log(key == undefined)
        if (key !== "undefined") {
            let myListItemElement = document.createElement("li")
            let paragraph = document.createElement("p")
            if (!loadedData.dark){
                myListItemElement.classList.add("light");
            }

            myListItemElement.id = key
            paragraph.textContent = value.title
            myListItemElement.appendChild(paragraph)
            myListElement.prepend(myListItemElement)

            myListItemElement.addEventListener("click", () =>{
                loadChat(myListItemElement.id)
            })
        }

    }

}
function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}
function removeElementsByClass(className) {
    // Select all elements with the specified class
    const elements = document.querySelectorAll('.' + className);

    // Loop through the NodeList and remove each element
    elements.forEach(element => {
        element.remove();
    });
}
function loadChat(id){
    messages = chatData[id].messages
    chatID = id
    title = chatData[id].title
    document.querySelector("#welcomeMessageBox").style.display = "none"


    removeElementsByClass("messageContainer")
    for (let i = 0; i < messages.length; i++){
        if (messages[i].role === "user"){
            createMessageElement(userPP, "You", messages[i].content);
        }
        if (messages[i].role === "assistant"){
            createMessageElement(aiPP, messages[i].model, messages[i].content);
        }
        let chatBoxesContainer = document.querySelector("#chatBoxesContainer")
        chatBoxesContainer.scrollTop = chatBoxesContainer.scrollHeight;

    }
}
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
                        // console.log('Stream finished.');
                        messages.push({"role": "assistant", "content": chat, "model": model}); // Append the accumulated response once done
                        // console.log(chatID)
                        // console.log(messages)
                        chatData[chatID] = {"title": title, "messages": messages}
                        // console.log(chatData)
                        saveOrUpdateDataInIndexedDB(chatData)
                        displayAllChats()
                        return
                    }

                    // Decode and process the chunk
                    const chunk = decoder.decode(value, {stream: true});
                    const ck = JSON.parse(chunk);
                    // console.log(ck.message); // Log each message chunk

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
                    // console.error('Stream reading failed:', error);
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
    const optionsList = document.querySelector('.options');
    optionsList.classList.toggle('show');
}
function selectOption(value) {
    document.querySelector('#model').textContent = value;
    localStorage.setItem("lastUsedModel", JSON.stringify(value))
    toggleOptions();
}
function hideModelList(){
    let dropdowns = document.getElementsByClassName("options");
    for (let i = 0; i < dropdowns.length; i++) {
        let openDropdown = dropdowns[i];
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

    localStorage.setItem("dark", JSON.stringify(darkMode))
}

function listModels(dark, lastModel){
    getModels().then((data) => {
        // console.log(data.models)
        let models = data.models
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
        if (lastModel) {
            selectOption(lastModel)
        }
        else{
            selectOption("None")
        }
        hideModelList()
    })
}
function loadStuff(){
    let drk = JSON.parse(localStorage.getItem("dark"))
    let lastModel = JSON.parse(localStorage.getItem("lastUsedModel"))
    return {"dark": drk, "lastUsedModel": lastModel}
}

document.querySelector("#messageBox").addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        document.querySelector("#welcomeMessageBox").style.display = "none"
        getResponseFromOllama(document.querySelector("#messageBox").value, document.querySelector("#model").textContent)
        document.querySelector("#messageBox").value = ""
    }
})
document.querySelector('#newChatButton').addEventListener('click', () => {
    document.querySelector("#welcomeMessageBox").style.display = "flex"
    newChat()
})
document.querySelector(".selected-option").addEventListener('click', toggleOptions);
// document.querySelector("#model").addEventListener('click', toggleOptions)
// document.querySelector("#modelArrow").addEventListener('click', toggleOptions)

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

loadedData = loadStuff()

listModels(loadedData.dark, loadedData.lastUsedModel)
setDarkMode(loadedData.dark)

// saveOrUpdateDataInIndexedDB({})
loadDataFromIndexedDB()
