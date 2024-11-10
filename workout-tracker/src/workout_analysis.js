import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

const socket = io("http://localhost:5000", {
  pingInterval: 25000, // Send a ping every 25 seconds
  pingTimeout: 60000, // Allow 60 seconds for a pong response before closing
}); // Connect to Flask-SocketIO

function WorkoutAnalysis() {
  const [file, setFile] = useState(null);
  const [source, setSource] = useState("file");
  const [summary, setSummary] = useState(null);
  const [frame, setFrame] = useState(null); // State for video frames
  const [error, setError] = useState(""); // State to show error messages
  // const [workoutType, setWorkoutType] = useState("");
  const [bodyWeight, setBodyWeight] = useState("");
  const [feedback, setFeedback] = useState(""); // New state for real-time feedback
  // const { id } = useParams(); // Retrieve the workout ID from the URL
  const location = useLocation();
  const workoutType = location.state?.workoutType || ""; // Retrieve workout type from previous page
  const navigate = useNavigate(); // Initialize useNavigate
  console.log("Location state:", location.state);
  useEffect(() => {
    if (workoutType) {
      console.log(`Selected workout: ${workoutType}`);
      // Proceed with workout analysis setup
    } else {
      console.log("No workout type selected.");
    }
  }, [workoutType]);

  useEffect(() => {
    // Listen for frame data
    socket.on("frame", (frameData) => {
      setFrame(
        `data:image/jpeg;base64,${btoa(
          new Uint8Array(frameData).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        )}`
      );
    });

    // Listen for summary data
    socket.on("summary", (data) => {
      setSummary(data);
    });

    // Listen for real-time feedback data
    socket.on("feedback", (data) => {
      console.log(data);
      setFeedback(data.feedback); // Update feedback state with the specific property
    });

    return () => {
      socket.off("frame");
      socket.off("summary");
      socket.off("feedback");
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    uploadFile(selectedFile); // Automatically upload the file
  };

  const uploadFile = (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return axios
      .post("http://localhost:5000/upload", formData)
      .then((response) => {
        console.log("File uploaded successfully");
        return response.data.filename; // Return filename for further use
      })
      .catch((error) => {
        console.error("Error uploading file:", error);
        return null; // Return null if there's an error
      });
  };

  const handleUpload = async () => {
    if (!bodyWeight) {
      setError("Please enter your body weight.");
      return;
    }
    const parsedBodyWeight = parseFloat(bodyWeight);

    if (source === "file") {
      // Ensure a file is selected
      if (!file) {
        setError("Please select a file to upload.");
        return;
      }

      // Attempt to upload the file and get the filename
      const filename = await uploadFile(file);
      if (filename) {
        // Only emit if the filename is valid
        socket.emit("start_workout", {
          source: "file",
          filename: filename,
          workout_type: workoutType,
          body_weight: parsedBodyWeight, // Pass workout type to backend
        });
      } else {
        console.error("File upload failed; workout not started.");
      }
    } else if (source === "0") {
      // Emit directly if using the live camera
      socket.emit("start_workout", {
        source: "0",
        workout_type: workoutType,
        body_weight: parsedBodyWeight, // Include workout type
      });
    }
  };

  const handleSourceChange = (e) => {
    setSource(e.target.value);
    setFile(null); // Clear the selected file if changing source
    setError(""); // Clear any previous errors
  };

  const handleStopWorkout = () => {
    socket.emit("stop_workout");
  };

  return (
    <>
      <header className="bg-white shadow-md py-8 fixed top-0 left-0 w-full z-50">
        <div className="container mx-auto flex justify-between items-center px-4">
          <a href="#home" className="text-3xl font-bold text-orange-500">
            GymFluencer
          </a>

          {/* <nav className="hidden md:flex space-x-8 text-gray-700">
            <a href="#features" className="text-lg hover:text-orange-500">
              Features
            </a>
            <a href="#blog" className="text-lg hover:text-orange-500">
              Blog
            </a>
            <a href="#faqs" className="text-lg hover:text-orange-500">
              FAQs
            </a>
          </nav> */}

          <div className="space-x-4">
            <button className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
              Get Started
            </button>
            <button className="px-6 py-2 bg-green-600 rounded-full border-2 border-white text-white shadow-lg hover:bg-green-400 hover:shadow-xl">
              Download Now
            </button>
          </div>
        </div>
      </header>

      <div className="hero-section2 bg-cover bg-center h-screen flex flex-col items-center justify-center text-white text-center pt-16">
        <h1 className="text-4xl md:text-5xl font-bold">
          Track Your Fitness Journey
        </h1>
        <p className="text-lg md:text-xl max-w-lg mt-4">
          Discover the ultimate fitness companion with GymFluencer. Effortlessly
          log your workouts, count reps, and track calories burned. Stay
          motivated and achieve your goals with our user-friendly interface.
        </p>
      </div>

      <section className="flex flex-col items-center w-full p-8 mt-20">
        {/* Workout Tracker Section */}
        <div className="bg-blue-50 p-8 rounded-lg shadow-lg w-full max-w-xl mb-10">
          <h2 className="text-3xl font-semibold mb-6">Workout Tracker</h2>

          <div className="mb-4">
            <label className="text-lg">Enter Body Weight (kg):</label>
            <input
              type="number"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              className="border rounded p-2 w-full mb-5 text-lg"
            />
          </div>

          {/* Source Options */}
          <div className="flex justify-around mb-4">
            <label className="flex items-center text-lg">
              <input
                type="radio"
                value="file"
                checked={source === "file"}
                onChange={handleSourceChange}
                className="mr-2"
              />
              Upload a Recorded Video
            </label>
            <label className="flex items-center text-lg">
              <input
                type="radio"
                value="0"
                checked={source === "0"}
                onChange={handleSourceChange}
                className="mr-2"
              />
              Use Live Camera
            </label>
          </div>

          {/* File Input for Video Upload */}
          {source === "file" && (
            <input
              type="file"
              onChange={handleFileChange}
              className="border rounded p-3 w-full mb-5 text-lg"
            />
          )}
          {error && <p className="text-red-500 text-lg">{error}</p>}

          {/* Start and Stop Workout Buttons */}
          <button
            className="bg-blue-600 text-white rounded p-3 w-full mb-3 text-lg hover:bg-blue-700"
            onClick={handleUpload}
          >
            Start Workout
          </button>
          <button
            onClick={handleStopWorkout}
            className="bg-red-600 text-white rounded p-3 w-full text-lg hover:bg-red-700"
          >
            Stop Workout
          </button>

          {/* Display Video Frame */}
          {frame && (
            <div className="mt-6">
              <img
                src={frame}
                alt="Workout Frame"
                className="rounded-lg shadow-md w-full"
              />
            </div>
          )}
        </div>

        {/* Workout Summary Section */}
        {summary && (
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md mb-8 mx-auto text-center">
            <h2 className="text-2xl font-semibold mb-6">Workout Summary</h2>
            {Object.keys(summary).map((workout) => (
              <div key={workout} className="my-4">
                <p className="text-xl">
                  <strong className="font-semibold">Workout:</strong> {workout}
                </p>
                <p className="text-lg mt-2">
                  <strong className="font-semibold">Total Reps:</strong>{" "}
                  {summary[workout].reps}
                </p>
                <p className="text-lg mt-2">
                  <strong className="font-semibold">Total Calories:</strong>{" "}
                  {summary[workout].calories.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Real-time Feedback Section */}
        {feedback && (
          <div className="bg-white p-6 rounded-lg shadow-lg w-full mx-8 my-4">
            <h4 className="text-lg font-semibold mb-3">Real-time Feedback</h4>
            <p>
              {typeof feedback === "string"
                ? feedback
                : JSON.stringify(feedback)}
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-wrap justify-center items-center gap-6 w-full p-8 bg-gray-50">
        <h2 className="text-4xl font-semibold mb-6 w-full text-center">
          Diet Plan
        </h2>

        {/* Diet Plans */}
        {[
          {
            id: 1,
            name: "personalize Diet Plan",
            img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0f7LzfaL0H06kimUbEqrAj32zkRq3b4iCkQ&s",
          },
          {
            id: 2,
            name: "Weight Loss (Fat Loss) Diet Plan",
            img: "https://www.health-total.com/wp-content/themes/scalia/page_template/images/HT-new-website-Banner-weight-loss-for-woman-mob-banner.jpg",
          },
          {
            id: 3,
            name: "Muscle Building (Hypertrophy) Diet Plan",
            img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxidUuL4q_RA7168UEivMv31hzhN0pB6cN8g&s",
          },
          {
            id: 4,
            name: "Cutting Diet Plan",
            img: "https://fitnessvolt.com/wp-content/uploads/2020/12/cutting-diet-plan.jpg",
          },
          {
            id: 5,
            name: "Endurance/Performance Diet Plan",
            img: "https://images.squarespace-cdn.com/content/v1/60e4262d44d7285f8b935dd1/6772a91f-d19d-4c79-86a4-119abde0e8e3/rice+chickpea+salad.jpg",
          },
          {
            id: 6,
            name: "Keto Diet (Ketogenic)",
            img: "https://www.eatingwell.com/thmb/OjqIt-0hf2URXH1LS9CakKOaiUQ=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/complete-keto-diet-food-list-what-you-can-and-cannot-eat-if-youre-on-a-ketogenic-diet-3-cd4cd1fc60cb455bbe7eee6e3a7d4d2c.jpg",
          },
          {
            id: 7,
            name: "Vegetarian/Vegan Diet Plan",
            img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5fxsYHcGf7eS8L3X--FGM_9z8TngbCqycgQ&s",
          },
          {
            id: 8,
            name: "Intermittent Fasting Diet Plan",
            img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRc298u2-Ji7aunp33e-irRoSqdpgDBxEVGA&s",
          },
          {
            id: 9,
            name: "Paleo Diet Plan",
            img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCIDi6vAZ2aUSrHoug2W3EeVNJwLtN7V9gTw&s",
          },
        ].map((diet) => (
          <div
            key={diet.id}
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform transform hover:scale-105"
            onClick={() => {
              if (diet.name === "Weight Loss (Fat Loss) Diet Plan") {
                navigate("/weight-loss-diet"); // Navigate to the weight loss diet page
              } else if (diet.name === "personalize Diet Plan") {
                navigate("/Diet-form"); // Navigate to another specific diet page
              } else {
                // Handle other diet plans as necessary
                console.log(`Selected diet: ${diet.name}`);
              }
            }}
          >
            <img
              src={diet.img}
              alt={diet.name}
              className="h-40 w-full object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold">{diet.name}</h3>
              <p className="text-gray-600">A description of the {diet.name}.</p>
            </div>
          </div>
        ))}
      </section>

      {/* New Section Before Footer */}
      <footer className="bg-gray-800 text-white text-center py-4">
        <p>&copy; 2024 GymFluencer. All rights reserved.</p>
      </footer>
    </>
  );
}

export default WorkoutAnalysis;
