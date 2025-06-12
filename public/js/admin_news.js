import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { getFirestore, addDoc, collection, Timestamp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDp03_t7kWck8XTT9iqv3SIX8UqFp_C6w",
    authDomain: "bims-9aaa7.firebaseapp.com",
    databaseURL: "https://bims-9aaa7-default-rtdb.firebaseio.com",
    projectId: "bims-9aaa7",
    storageBucket: "bims-9aaa7.appspot.com",
    messagingSenderId: "323333588672",
    appId: "1:323333588672:web:16775be162a67673004f25",
    measurementId: "G-Q5FJD5VDKC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);

async function logActivity(action) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.error("No user is currently logged in");
            return;
        }

        const logData = {
            userId: user.uid,
            email: user.email,
            action: action,
            role: 'Admin',
            timestamp: Timestamp.now()
        };
        await addDoc(collection(db, 'activity_logs'), logData);
    } catch (error) {
        console.error("Error logging activity:", error);
    }
}

// Image Upload Logic
document.getElementById('uploadImage').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        alert('Please select an image file to preview.');
    }
});

// News Submission Logic
document.getElementById('submitNews').addEventListener('click', async () => {
    const title = document.getElementById('newsTitle').value;
    const description = document.getElementById('newsDescription').value;
    const date = document.getElementById('newsDate').value;
    const fileInput = document.getElementById('fileInput').files[0];
    
    if (!title || !description || !fileInput || !date) {
        alert('Please fill out all fields and upload an image.');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to submit news.');
            return;
        }

        const imageRef = sRef(storage, 'news/' + fileInput.name);
        await uploadBytes(imageRef, fileInput);
        const imageURL = await getDownloadURL(imageRef);

        const newNewsRef = ref(database, 'news/' + Date.now());
        await set(newNewsRef, {
            title,
            description,
            imageURL,
            date
        });

        // Log the activity
        await logActivity(`${user.email} has added a new news item.`);

        alert('News submitted successfully!');

        // Clear form fields
        document.getElementById('newsTitle').value = '';
        document.getElementById('newsDescription').value = '';
        document.getElementById('fileInput').value = '';
        document.getElementById('newsDate').value = '';
        document.getElementById('imagePreview').style.display = 'none';
    } catch (error) {
        console.error('Error uploading image or saving news:', error);
        alert('Error submitting news. Please try again.');
    }
});

// Fetch and display news
onValue(ref(database, 'news/'), (snapshot) => {
    const newsContainer = document.getElementById('newsContainer');
    newsContainer.innerHTML = '';
    snapshot.forEach(childSnapshot => {
        const newsData = childSnapshot.val();
        const newsItem = document.createElement('div');
        newsItem.classList.add('news-item');
        newsItem.innerHTML = `
            <h2>${newsData.title}</h2>
            <p>${newsData.description}</p>
            <p class="news-date">${new Date(newsData.date).toLocaleDateString()}</p>
            <img src="${newsData.imageURL}" alt="News Image">
            <button class="delete-btn" data-id="${childSnapshot.key}">Delete</button>
        `;
        newsContainer.appendChild(newsItem);
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('.news-item .delete-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const newsId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this news item?')) {
                try {
                    const user = auth.currentUser;
                    if (!user) {
                        alert('Please log in to delete news.');
                        return;
                    }

                    await remove(ref(database, 'news/' + newsId));
                    
                    // Log the deletion activity
                    await logActivity(`${user.email} has deleted a news item.`);
                    
                    alert('News deleted successfully!');
                } catch (error) {
                    console.error('Error deleting news:', error);
                    alert('Error deleting news. Please try again.');
                }
            }
        });
    });
});