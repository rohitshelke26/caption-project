document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabase;

    // Report Sighting Page
    const sightingForm = document.getElementById('sighting-form');
    const getLocationBtn = document.getElementById('getLocationBtn');
    const locationInput = document.getElementById('location');
    const successMessage = document.getElementById('success-message');
    const takePhotoBtn = document.getElementById('takePhotoBtn');
    const cameraContainer = document.getElementById('camera-container');
    const cameraStream = document.getElementById('camera-stream');
    const snapBtn = document.getElementById('snapBtn');
    const photoInput = document.getElementById('photo');
    const previewPhotoBtn = document.getElementById('previewPhotoBtn');
    const previewModal = document.getElementById('previewModal');
    const modalImg = document.getElementById('img-preview');
    const closeModal = document.querySelector('.close');
    const modelLoadingMessage = document.getElementById('model-loading-message');
    const submitBtn = document.querySelector('#sighting-form button[type="submit"]');
    let isAnimal = false;
    let model;

    if (modelLoadingMessage) {
        modelLoadingMessage.style.display = 'block';
        submitBtn.disabled = true;
    }

    if (window.location.pathname.endsWith('report.html')) {
        try {
            model = await mobilenet.load();
            if (modelLoadingMessage) {
                modelLoadingMessage.style.display = 'none';
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error loading model:', error);
            if (modelLoadingMessage) {
                modelLoadingMessage.textContent = 'Error loading model. Please refresh the page.';
            }
        }
    }

    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    const lat = position.coords.latitude.toFixed(5);
                    const lon = position.coords.longitude.toFixed(5);
                    locationInput.value = `${lat}, ${lon}`;
                }, () => {
                    alert('Could not get your location. Please enter it manually.');
                });
            } else {
                alert('Geolocation is not supported by your browser.');
            }
        });
    }

    if (takePhotoBtn) {
        takePhotoBtn.addEventListener('click', async () => {
            cameraContainer.style.display = 'block';
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                cameraStream.srcObject = stream;
            } catch (err) {
                alert('Could not access the camera. Please check permissions.');
                cameraContainer.style.display = 'none';
            }
        });
    }

    if (snapBtn) {
        snapBtn.addEventListener('click', () => {
            const canvas = document.createElement('canvas');
            canvas.width = cameraStream.videoWidth;
            canvas.height = cameraStream.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);

            const date = new Date().toLocaleString();
            const location = locationInput.value;
            context.font = '20px Arial';
            context.fillStyle = 'white';
            context.textAlign = 'left';
            context.fillText(date, 10, canvas.height - 40);
            context.fillText(location, 10, canvas.height - 15);
            
            canvas.toBlob(blob => {
                const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                photoInput.files = dataTransfer.files;
                photoInput.dispatchEvent(new Event('change'));

                cameraStream.srcObject.getTracks().forEach(track => track.stop());
                cameraContainer.style.display = 'none';
            }, 'image/jpeg');
        });
    }

    if (previewPhotoBtn) {
        previewPhotoBtn.addEventListener('click', () => {
            const file = photoInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    modalImg.src = e.target.result;
                    previewModal.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if(closeModal) {
        closeModal.onclick = () => {
            previewModal.style.display = "none";
        }
    }

    if (photoInput) {
        photoInput.addEventListener('change', async () => {
            const photoFile = photoInput.files[0];
            if (!photoFile) {
                return;
            }
            isAnimal = await isAnimalPhoto(photoFile);
            if (!isAnimal) {
                alert('The uploaded photo does not appear to be an animal. Please upload a different photo.');
            }
        });
    }

    if (sightingForm) {
        sightingForm.addEventListener('submit', async e => {
            e.preventDefault();

            if (!isAnimal) {
                alert('The uploaded photo does not appear to be an animal. Please upload a different photo.');
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('You must be logged in to report a sighting.');
                window.location.href = 'login.html';
                return;
            }

            const photoFile = photoInput.files[0];
            const { data, error } = await supabase.storage
                .from('sightings')
                .upload(`${session.user.id}/${Date.now()}_${photoFile.name}`, photoFile);

            if (error) {
                alert('Error uploading photo.');
                console.error(error);
                return;
            }

            const { data: { publicUrl } } = supabase.storage.from('sightings').getPublicUrl(data.path);

            const newSighting = {
                user_id: session.user.id,
                name: e.target.name.value,
                species: e.target.species.value,
                description: e.target.description.value,
                location: e.target.location.value,
                photo_url: publicUrl
            };

            const { error: insertError } = await supabase.from('sightings').insert([newSighting]);

            if (insertError) {
                alert('Error submitting report.');
                console.error(insertError);
            } else {
                sightingForm.style.display = 'none';
                successMessage.style.display = 'block';
            }
        });
    }

    async function isAnimalPhoto(file) {
        if (!model) {
            console.log('Model not loaded yet');
            return false;
        }

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => img.onload = resolve);

        const predictions = await model.classify(img);

        console.log(predictions);

        const animalKeywords = [
            'animal', 'bird', 'mammal', 'reptile', 'amphibian', 'fish', 'insect', 'bug', 'wildlife',
            'cat', 'dog', 'lion', 'tiger', 'bear', 'elephant', 'monkey', 'gorilla', 'zebra', 'giraffe',
            'wolf', 'fox', 'deer', 'leopard', 'cheetah', 'rhino', 'hippopotamus', 'crocodile', 'snake',
            'lizard', 'turtle', 'frog', 'salamander', 'tuna', 'salmon', 'shark', 'whale', 'dolphin',
            'eagle', 'hawk', 'owl', 'parrot', 'pigeon', 'sparrow', 'butterfly', 'bee', 'ant', 'spider'
        ];

        return predictions.some(p =>
            animalKeywords.some(keyword => p.className.toLowerCase().includes(keyword)) && p.probability > 0.3
        );
    }
});