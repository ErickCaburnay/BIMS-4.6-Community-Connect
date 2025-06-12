import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBDp03_t7kWck8XTT9iqv3SIX8UqFp_C6w",
  authDomain: "bims-9aaa7.firebaseapp.com",
  projectId: "bims-9aaa7",
  storageBucket: "bims-9aaa7.appspot.com",
  messagingSenderId: "323333588672",
  appId: "1:323333588672:web:cfb7ea2dff4d9eb2004f25",
  measurementId: "G-RQJBMNMFQ8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let genderBarChartInstance = null;
let maritalBarChartInstance = null;
let employmentBarChartInstance = null;

let totalNgoCount = 0;
let totalEstablishmentCount = 0;
let totalMaleCount = 0;
let totalFemaleCount = 0;
let totalPopulationCount = 0;

async function fetchData() {
  try {
    const counters = [
      "4psCounter",
      "greenladiesCounter",
      "kdbmCounter",
      "pwdCounter",
      "soloparentCounter",
      "seniorCounter",
    ];

    const promises = counters.map((counter) => {
      const docRef = doc(db, "counters", counter);
      return getDoc(docRef);
    });

    const docs = await Promise.all(promises);
    const data = docs.map((docSnap) =>
      docSnap.exists() ? docSnap.data().count : 0
    );

    totalNgoCount = data.reduce((acc, count) => acc + count, 0);
    document.getElementById("ngoCounterValue").textContent = totalNgoCount;
    updateCharts(data);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function updateCharts(counts) {
  const pieData = {
    labels: [
      "4ps Counter",
      "Green Ladies Counter",
      "KDBM Counter",
      "PWD Counter",
      "Solo Parent Counter",
      "Senior Citizen Counter",
    ],
    datasets: [
      {
        label: "Count",
        data: counts,
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF99FF",
        ],
      },
    ],
  };

  new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: pieData,
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            generateLabels: function (chart) {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const meta = chart.getDatasetMeta(0);
                  const style = meta.controller.getStyle(i);
                  return {
                    text: `${label}: ${data.datasets[0].data[i]}`,
                    fillStyle: style.backgroundColor,
                    strokeStyle: style.borderColor,
                    lineWidth: style.borderWidth,
                    hidden:
                      isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                    index: i,
                  };
                });
              }
              return [];
            },
          },
        },
      },
    },
  });
}

async function fetchColumnChartData() {
  try {
    const hallCounterRef = doc(db, "counters", "hallCounter");
    const courtCounterRef = doc(db, "counters", "courtCounter");
    const eateryCounterRef = doc(db, "counters", "eateryCounter");
    const schoolCounterRef = doc(db, "counters", "schoolCounter");
    const storeCounterRef = doc(db, "counters", "storeCounter");

    const [hallSnap, courtSnap, eaterySnap, schoolSnap, storeSnap] =
      await Promise.all([
        getDoc(hallCounterRef),
        getDoc(courtCounterRef),
        getDoc(eateryCounterRef),
        getDoc(schoolCounterRef),
        getDoc(storeCounterRef),
      ]);

    const counts = [
      hallSnap.exists() ? hallSnap.data().count : 0,
      courtSnap.exists() ? courtSnap.data().count : 0,
      eaterySnap.exists() ? eaterySnap.data().count : 0,
      schoolSnap.exists() ? schoolSnap.data().count : 0,
      storeSnap.exists() ? storeSnap.data().count : 0,
    ];

    totalEstablishmentCount = counts.reduce((acc, count) => acc + count, 0);
    document.getElementById("establishmentsCounterValue").textContent =
      totalEstablishmentCount;
    updateColumnChart(counts);
  } catch (error) {
    console.error("Error fetching column chart data:", error);
  }
}

function updateColumnChart(counts) {
  columnChartInstance = new Chart(document.getElementById("columnChart"), {
    type: "bar",
    data: {
      labels: ["Hall", "Court", "Eatery", "School", "Store"],
      datasets: [
        {
          label: "Establishment Count",
          data: counts,
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            font: {
              size: 14,
            },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 14,
            },
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            generateLabels: function (chart) {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const meta = chart.getDatasetMeta(0);
                  const style = meta.controller.getStyle(i);
                  return {
                    text: `${label}: ${data.datasets[0].data[i]}`,
                    fillStyle: style.backgroundColor,
                    strokeStyle: style.borderColor,
                    lineWidth: style.borderWidth,
                    hidden:
                      isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                    index: i,
                  };
                });
              }
              return [];
            },
          },
        },
      },
    },
  });
}

async function fetchGenderData() {
  try {
    const usersCollectionRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollectionRef);

    let maleCount = 0;
    let femaleCount = 0;

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.gender === "Male" || data.gender === "MALE") {
        maleCount++;
      } else if (data.gender === "Female" || data.gender === "FEMALE") {
        femaleCount++;
      }
    });

    totalMaleCount = maleCount;
    totalFemaleCount = femaleCount;
    document.getElementById("maleCounterValue").textContent =
      "Male: " + totalMaleCount;
    document.getElementById("femaleCounterValue").textContent =
      "Female: " + totalFemaleCount;
    updateBarChart(maleCount, femaleCount);
  } catch (error) {
    console.error("Error fetching gender data:", error);
  }
}

function updateBarChart(maleCount, femaleCount) {
  if (genderBarChartInstance) {
    genderBarChartInstance.destroy();
  }

  genderBarChartInstance = new Chart(
    document.getElementById("genderBarChart"),
    {
      type: "bar",
      data: {
        labels: ["Male", "Female"],
        datasets: [
          {
            label: "Count",
            data: [maleCount, femaleCount],
            backgroundColor: ["#36A2EB", "#FF6384"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              font: {
                size: 14,
              },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 14,
              },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              generateLabels: function (chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const meta = chart.getDatasetMeta(0);
                    const style = meta.controller.getStyle(i);
                    return {
                      text: `${label}: ${data.datasets[0].data[i]}`,
                      fillStyle: style.backgroundColor,
                      strokeStyle: style.borderColor,
                      lineWidth: style.borderWidth,
                      hidden:
                        isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
        },
      },
    }
  );
}

async function fetchMaritalData() {
  try {
    const usersCollectionRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollectionRef);
    let singleCount = 0;
    let marriedCount = 0;
    let widowedCount = 0;
    let divorcedCount = 0;
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.maritalStatus === "Single" || data.maritalStatus === "SINGLE") {
        singleCount++;
      } else if (
        data.maritalStatus === "Married" ||
        data.maritalStatus === "MARRIED"
      ) {
        marriedCount++;
      } else if (
        data.maritalStatus === "Widowed" ||
        data.maritalStatus === "WIDOWED"
      ) {
        widowedCount++;
      } else if (
        data.maritalStatus === "Divorced" ||
        data.maritalStatus === "DIVORCED"
      ) {
        divorcedCount++;
      }
    });
    updateMaritalChart([
      singleCount,
      marriedCount,
      widowedCount,
      divorcedCount,
    ]);
  } catch (error) {
    console.error("Error fetching marital data:", error);
  }
}

function updateMaritalChart(counts) {
  if (maritalBarChartInstance) {
    maritalBarChartInstance.destroy();
  }

  maritalBarChartInstance = new Chart(
    document.getElementById("maritalBarChart"),
    {
      type: "bar",
      data: {
        labels: ["Single", "Married", "Widowed", "Divorced"],
        datasets: [
          {
            label: "Count",
            data: counts,
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              font: {
                size: 14,
              },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 14,
              },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              generateLabels: function (chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const meta = chart.getDatasetMeta(0);
                    const style = meta.controller.getStyle(i);
                    return {
                      text: `${label}: ${data.datasets[0].data[i]}`,
                      fillStyle: style.backgroundColor,
                      strokeStyle: style.borderColor,
                      lineWidth: style.borderWidth,
                      hidden:
                        isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
        },
      },
    }
  );
}

async function fetchEmploymentData() {
  try {
    const usersCollectionRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollectionRef);
    let employedCount = 0;
    let unemployedCount = 0;
    let studentCount = 0;
    let selfEmployedCount = 0;

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (
        data.employmentStatus === "Employed" ||
        data.employmentStatus === "EMPLOYED"
      ) {
        employedCount++;
      } else if (
        data.employmentStatus === "Unemployed" ||
        data.employmentStatus === "UNEMPLOYED"
      ) {
        unemployedCount++;
      } else if (
        data.employmentStatus === "Self-Employed" ||
        data.employmentStatus === "SELF-EMPLOYED"
      ) {
        selfEmployedCount++;
      } else if (
        data.employmentStatus === "Student" ||
        data.employmentStatus === "STUDENT"
      ) {
        studentCount++;
      }
    });

    updateEmploymentChart([
      employedCount,
      unemployedCount,
      studentCount,
      selfEmployedCount,
    ]);
  } catch (error) {
    console.error("Error fetching employment data:", error);
  }
}

function updateEmploymentChart(counts) {
  if (employmentBarChartInstance) {
    employmentBarChartInstance.destroy();
  }

  employmentBarChartInstance = new Chart(
    document.getElementById("horizontalBarChart"),
    {
      type: "bar",
      data: {
        labels: ["Employed", "Unemployed", "Student", "Self-Employed"],
        datasets: [
          {
            label: "Employment Status",
            data: counts,
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
            ],
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 14,
              },
            },
          },
          y: {
            ticks: {
              font: {
                size: 14,
              },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              generateLabels: function (chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const meta = chart.getDatasetMeta(0);
                    const style = meta.controller.getStyle(i);
                    return {
                      text: `${label}: ${data.datasets[0].data[i]}`,
                      fillStyle: style.backgroundColor,
                      strokeStyle: style.borderColor,
                      lineWidth: style.borderWidth,
                      hidden:
                        isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
        },
      },
    }
  );
}

let populationBarChart;

async function fetchPopulationCount() {
  try {
    const populationCollectionRef = collection(db, "population");
    const populationSnapshot = await getDocs(populationCollectionRef);
    const populationData = {};

    populationSnapshot.forEach((doc) => {
      const data = doc.data();
      const year = doc.id;
      if (data.count) {
        populationData[year] = data.count;
      }
    });

    totalPopulationCount = Object.values(populationData).reduce(
      (acc, count) => acc + count,
      0
    );
    document.getElementById("totalPopulationValue").textContent =
      totalPopulationCount;
    updatePopulationCount(populationData);
  } catch (error) {
    console.error("Error fetching population count:", error);
  }
}

function updatePopulationCount(populationData) {
  const ctx = document.getElementById("populationBarChart").getContext("2d");

  const years = Object.keys(populationData);
  const counts = Object.values(populationData);

  // Generate a random color for each year
  const backgroundColors = years.map(() => {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, 0.6)`;
  });

  if (populationBarChart) {
    populationBarChart.data.labels = years;
    populationBarChart.data.datasets[0].data = counts;
    populationBarChart.data.datasets[0].backgroundColor = backgroundColors;
    populationBarChart.update();
  } else {
    populationBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: years,
        datasets: [
          {
            label: "Population",
            data: counts,
            backgroundColor: backgroundColors,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              font: {
                size: 14,
              },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 14,
              },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              generateLabels: function (chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const meta = chart.getDatasetMeta(0);
                    const style = meta.controller.getStyle(i);
                    return {
                      text: `${label}: ${data.datasets[0].data[i]}`,
                      fillStyle: style.backgroundColor,
                      strokeStyle: style.borderColor,
                      lineWidth: style.borderWidth,
                      hidden:
                        isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
        },
      },
    });
  }
}

window.onload = function () {
  fetchData();
  fetchColumnChartData();
  fetchGenderData();
  fetchMaritalData();
  fetchEmploymentData();
  fetchPopulationCount();
};
