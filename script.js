document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabase;

    // Mobile Navigation
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');

    if (burger) {
        burger.addEventListener('click', () => {
            nav.classList.toggle('nav-active');
            burger.classList.toggle('toggle');
        });
    }

    // Check user auth state
    const { data: { session } } = await supabase.auth.getSession();
    updateNav(session);

    supabase.auth.onAuthStateChange((_event, session) => {
        updateNav(session);
    });

    function updateNav(session) {
        const loginRegisterNav = document.getElementById('login-register-nav');
        const profileNav = document.getElementById('profile-nav');

        if (session) {
            if (loginRegisterNav) loginRegisterNav.style.display = 'none';
            if (profileNav) profileNav.style.display = 'block';
        } else {
            if (loginRegisterNav) loginRegisterNav.style.display = 'block';
            if (profileNav) profileNav.style.display = 'none';
        }
    }

    // Login/Register Page
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const toggleFormLink = document.getElementById('toggle-form');
    const formTitle = document.getElementById('form-title');
    const authMessage = document.getElementById('auth-message');

    if (toggleFormLink) {
        toggleFormLink.addEventListener('click', e => {
            e.preventDefault();
            if (loginForm.style.display === 'none') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                formTitle.textContent = 'Login';
                toggleFormLink.textContent = 'Don\'t have an account? Register here.';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                formTitle.textContent = 'Register';
                toggleFormLink.textContent = 'Already have an account? Login here.';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async e => {
            e.preventDefault();
            const name = e.target.querySelector('#register-name').value;
            const email = e.target.querySelector('#register-email').value;
            const password = e.target.querySelector('#register-password').value;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    }
                }
            });

            if (error) {
                authMessage.textContent = error.message;
                authMessage.style.display = 'block';
            } else {
                authMessage.textContent = 'Registration successful! Please check your email to confirm your account.';
                authMessage.style.display = 'block';
                registerForm.reset();
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async e => {
            e.preventDefault();
            const email = e.target.querySelector('#login-email').value;
            const password = e.target.querySelector('#login-password').value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                authMessage.textContent = error.message;
                authMessage.style.display = 'block';
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // Profile Page
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const logoutBtn = document.getElementById('logout-btn');

    if (profileName && profileEmail) {
        if (session) {
            profileName.textContent = session.user.user_metadata.full_name;
            profileEmail.textContent = session.user.email;
        } else if (window.location.pathname.endsWith('profile.html')) {
            window.location.href = 'login.html';
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // Report Sighting Page (in report.js)

    // Report Illegal Activity Page
    const illegalActivityForm = document.getElementById('illegal-activity-form');
    if (illegalActivityForm) {
        illegalActivityForm.addEventListener('submit', async e => {
            e.preventDefault();
            const photoFile = document.getElementById('photo').files[0];
            let photoUrl = null;

            if (photoFile) {
                const { data, error } = await supabase.storage
                    .from('illegal_activities')
                    .upload(`${Date.now()}_${photoFile.name}`, photoFile);

                if (error) {
                    alert('Error uploading photo.');
                    console.error(error);
                    return;
                }
                
                const { data: { publicUrl } } = supabase.storage.from('illegal_activities').getPublicUrl(data.path);
                photoUrl = publicUrl;
            }

            const newIllegalActivity = {
                activity_type: e.target['activity-type'].value,
                description: e.target['activity-description'].value,
                location: e.target['activity-location'].value,
                photo_url: photoUrl
            };

            const { error } = await supabase.from('illegal_activities').insert([newIllegalActivity]);

            if (error) {
                alert('Error submitting report.');
                console.error(error);
            } else {
                alert('Your report has been submitted anonymously. Thank you for your help!');
                illegalActivityForm.reset();
            }
        });
    }

    // Map View Page
    if (document.getElementById('map')) {
        const map = L.map('map').setView([20.5937, 78.9629], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const { data: sightings, error } = await supabase.from('sightings').select('*');

        if (error) {
            console.error('Error fetching sightings:', error);
        } else {
            sightings.forEach(sighting => {
                const [lat, lon] = sighting.location.split(',').map(Number);
                if (lat && lon) {
                    L.marker([lat, lon])
                        .addTo(map)
                        .bindPopup(`<b>${sighting.species}</b><br>${sighting.description}<br><img src="${sighting.photo_url}" width="100">`);
                }
            });
        }
    }

    // View Sightings Page
    const sightingsGallery = document.getElementById('gallery');
    const allPhotosBtn = document.getElementById('all-photos');
    const nearbyPhotosBtn = document.getElementById('nearby-photos');

    function showLoader() {
        if (sightingsGallery) {
            sightingsGallery.innerHTML = '<div class="loader"></div>';
        }
    }

    function hideLoader() {
        if (sightingsGallery) {
            const loader = sightingsGallery.querySelector('.loader');
            if (loader) {
                loader.remove();
            }
        }
    }

    async function displaySightings(filterFn) {
        showLoader();
        const { data: sightings, error } = await supabase.from('sightings').select('*');

        if (error) {
            console.error('Error fetching sightings:', error);
            hideLoader();
            return;
        }

        let filteredSightings = sightings;
        if (filterFn) {
            filteredSightings = await filterFn(sightings);
        }

        hideLoader();
        sightingsGallery.innerHTML = '';
        if (filteredSightings.length === 0) {
            sightingsGallery.innerHTML = '<p>No sightings to display.</p>';
            return;
        }

        filteredSightings.forEach(sighting => {
            const sightingElement = document.createElement('div');
            sightingElement.classList.add('gallery-item');
            sightingElement.dataset.sighting = JSON.stringify(sighting);
            sightingElement.innerHTML = `
                <img src="${sighting.photo_url}" alt="${sighting.species}">
                <div class="gallery-item-info">
                    <h3>${sighting.species}</h3>
                    <p>${sighting.description}</p>
                </div>
            `;
            sightingsGallery.appendChild(sightingElement);
        });
    }

    if (sightingsGallery) {
        displaySightings();

        if (allPhotosBtn) {
            allPhotosBtn.addEventListener('click', () => {
                displaySightings();
            });
        }

        if (nearbyPhotosBtn) {
            nearbyPhotosBtn.addEventListener('click', () => {
                displaySightings(async (sightings) => {
                    return new Promise((resolve) => {
                        if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(position => {
                                const userLat = position.coords.latitude;
                                const userLon = position.coords.longitude;

                                const nearbySightings = sightings.filter(sighting => {
                                    const [sightingLat, sightingLon] = sighting.location.split(',').map(Number);
                                    if (!sightingLat || !sightingLon) return false;

                                    const distance = getDistance(userLat, userLon, sightingLat, sightingLon);
                                    return distance <= 5; // 5 km radius
                                });
                                resolve(nearbySightings);

                            }, () => {
                                alert('Could not get your location.');
                                resolve([]);
                            });
                        } else {
                            alert('Geolocation is not supported by your browser.');
                            resolve([]);
                        }
                    });
                });
            });
        }
    }
    
    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    // Sighting Modal
    const modal = document.getElementById("sighting-modal");
    const modalImg = document.getElementById("modal-image");
    const modalSpecies = document.getElementById("modal-species");
    const modalDescription = document.getElementById("modal-description");
    const modalLocation = document.getElementById("modal-location");
    const closeModal = document.querySelector(".close-modal");

    if(closeModal) {
        closeModal.onclick = () => {
            modal.style.display = "none";
        }
    }

    if (sightingsGallery) {
        sightingsGallery.addEventListener('click', e => {
            const item = e.target.closest('.gallery-item');
            if (item) {
                const sighting = JSON.parse(item.dataset.sighting);
                modal.style.display = "block";
                modalImg.src = sighting.photo_url;
                modalSpecies.textContent = sighting.species;
                modalDescription.textContent = sighting.description;
                modalLocation.textContent = sighting.location;
            }
        });
    }
});
