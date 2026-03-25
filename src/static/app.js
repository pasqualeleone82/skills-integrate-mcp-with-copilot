document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");

  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const sessionInfo = document.getElementById("session-info");
  const currentUserLabel = document.getElementById("current-user");

  const signupContainer = document.getElementById("signup-container");
  const signupForm = document.getElementById("signup-form");
  const activitySelect = document.getElementById("activity");

  const unregisterContainer = document.getElementById("unregister-container");
  const unregisterForm = document.getElementById("unregister-form");
  const unregisterActivitySelect = document.getElementById("unregister-activity");

  const leaderDashboard = document.getElementById("leader-dashboard");
  const leaderRemoveForm = document.getElementById("leader-remove-form");
  const leaderActivitySelect = document.getElementById("leader-activity");
  const leaderParticipantSelect = document.getElementById("leader-participant");

  let token = localStorage.getItem("authToken") || "";
  let currentUser = null;
  let latestActivities = {};

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function authHeaders() {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  function isLeader() {
    return currentUser && currentUser.role === "leader";
  }

  function setSelectDefault(selectEl, placeholder) {
    selectEl.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    selectEl.appendChild(option);
  }

  function updateAuthUI() {
    const isLoggedIn = Boolean(currentUser);

    loginForm.classList.toggle("hidden", isLoggedIn);
    sessionInfo.classList.toggle("hidden", !isLoggedIn);
    signupContainer.classList.toggle("hidden", !isLoggedIn);
    unregisterContainer.classList.toggle("hidden", !isLoggedIn);
    leaderDashboard.classList.toggle("hidden", !isLeader());

    if (isLoggedIn) {
      currentUserLabel.textContent = `Logged in as ${currentUser.email} (${currentUser.role})`;
    } else {
      currentUserLabel.textContent = "";
    }
  }

  function populateSelects(activities) {
    setSelectDefault(activitySelect, "-- Select an activity --");
    setSelectDefault(unregisterActivitySelect, "-- Select an activity --");
    setSelectDefault(leaderActivitySelect, "-- Select an activity --");
    setSelectDefault(leaderParticipantSelect, "-- Select a participant --");

    Object.keys(activities).forEach((name) => {
      const optionA = document.createElement("option");
      optionA.value = name;
      optionA.textContent = name;
      activitySelect.appendChild(optionA);

      const optionB = document.createElement("option");
      optionB.value = name;
      optionB.textContent = name;
      unregisterActivitySelect.appendChild(optionB);

      const optionC = document.createElement("option");
      optionC.value = name;
      optionC.textContent = name;
      leaderActivitySelect.appendChild(optionC);
    });
  }

  function refreshLeaderParticipantSelect() {
    setSelectDefault(leaderParticipantSelect, "-- Select a participant --");
    const selectedActivity = leaderActivitySelect.value;
    if (!selectedActivity || !latestActivities[selectedActivity]) {
      return;
    }

    latestActivities[selectedActivity].participants.forEach((email) => {
      const option = document.createElement("option");
      option.value = email;
      option.textContent = email;
      leaderParticipantSelect.appendChild(option);
    });
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      latestActivities = activities;

      activitiesList.innerHTML = "";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
                <h5>Participants:</h5>
                <ul class="participants-list">
                  ${details.participants
                    .map((email) => {
                      if (!isLeader()) {
                        return `<li><span class="participant-email">${email}</span></li>`;
                      }
                      return `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">Remove</button></li>`;
                    })
                    .join("")}
                </ul>
              </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleLeaderCardRemoval);
      });

      populateSelects(activities);
      refreshLeaderParticipantSelect();
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function requestJson(url, options = {}, autoLogoutOnAuthError = true) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = data.detail || "Request failed";
      if (response.status === 401 && autoLogoutOnAuthError) {
        localStorage.removeItem("authToken");
        token = "";
        currentUser = null;
        updateAuthUI();
      }
      throw new Error(detail);
    }

    return data;
  }

  async function loadCurrentUser() {
    if (!token) {
      currentUser = null;
      updateAuthUI();
      return;
    }

    try {
      const me = await requestJson(
        "/auth/me",
        {
          headers: {
            ...authHeaders(),
          },
        },
        true
      );
      currentUser = me;
    } catch (error) {
      currentUser = null;
      token = "";
      localStorage.removeItem("authToken");
      showMessage(error.message, "error");
    }

    updateAuthUI();
  }

  async function handleLeaderRemoval(activity, email) {
    try {
      const result = await requestJson(
        `/management/activities/${encodeURIComponent(activity)}/participants/${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            ...authHeaders(),
          },
        }
      );
      showMessage(result.message, "success");
      await fetchActivities();
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleLeaderCardRemoval(event) {
    const activity = event.target.getAttribute("data-activity");
    const email = event.target.getAttribute("data-email");
    await handleLeaderRemoval(activity, email);
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const result = await requestJson(
        "/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        },
        false
      );

      token = result.token;
      localStorage.setItem("authToken", token);
      currentUser = {
        email: result.email,
        role: result.role,
      };

      loginForm.reset();
      updateAuthUI();
      showMessage(result.message, "success");
      await fetchActivities();
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      const result = await requestJson("/auth/logout", {
        method: "POST",
        headers: {
          ...authHeaders(),
        },
      });
      showMessage(result.message, "success");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      token = "";
      currentUser = null;
      localStorage.removeItem("authToken");
      updateAuthUI();
      await fetchActivities();
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const activity = activitySelect.value;
    try {
      const result = await requestJson(`/activities/${encodeURIComponent(activity)}/signup`, {
        method: "POST",
        headers: {
          ...authHeaders(),
        },
      });

      showMessage(result.message, "success");
      signupForm.reset();
      await fetchActivities();
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  unregisterForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const activity = unregisterActivitySelect.value;
    try {
      const result = await requestJson(`/activities/${encodeURIComponent(activity)}/unregister`, {
        method: "DELETE",
        headers: {
          ...authHeaders(),
        },
      });

      showMessage(result.message, "success");
      unregisterForm.reset();
      await fetchActivities();
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  leaderActivitySelect.addEventListener("change", refreshLeaderParticipantSelect);

  leaderRemoveForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const activity = leaderActivitySelect.value;
    const email = leaderParticipantSelect.value;
    await handleLeaderRemoval(activity, email);
    leaderRemoveForm.reset();
    refreshLeaderParticipantSelect();
  });

  async function init() {
    await loadCurrentUser();
    await fetchActivities();
  }

  init();
});
