import React, { useState, useEffect } from "react";
import { FaHome, FaHistory } from "react-icons/fa";
import { MdElectricScooter } from "react-icons/md";
import { FiPlus } from "react-icons/fi";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const API_URL = "https://scoot-me-production.up.railway.app";

export default function BookRide() {
  const [query, setQuery] = useState("");
  const [scooters, setScooters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScooters = async () => {
      try {
        const token = localStorage.getItem("token");
        

const res = await axios.get(`${API_URL}/api/scooter`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

        setScooters(res.data);
      } catch (err) {
        console.error("Failed to fetch scooters:", err);
        toast.error("Failed to load scooters. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchScooters();
  }, []);

  const filtered = scooters
  .filter(
    (s) =>
      s.scooterName.toLowerCase().includes(query.toLowerCase()) ||
      s.location.locationName.toLowerCase().includes(query.toLowerCase())
  )
  .sort((a, b) => {
    if (a.status === "Available" && b.status !== "Available") return -1;
    if (a.status !== "Available" && b.status === "Available") return 1;
    return 0;
  });


  const handleBook = async (scooter) => {
    try {
      const token = localStorage.getItem("token");
  
      await axios.patch(
        `${API_URL}/api/scooter/${scooter._id}/book`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      toast.success(`Successfully booked ${scooter.scooterName}!`);
  
      // Update scooter status locally
      setScooters((prevScooters) =>
        prevScooters.map((s) =>
          s._id === scooter._id ? { ...s, status: "In Use" } : s
        )
      );
    } catch (err) {
      console.error("Booking failed:", err);
      toast.error(err.response?.data?.message || "Booking failed");
    }
  };
  const handleLogOut = () => {
    localStorage.removeItem("token");
    window.location.replace("/login")
  };

  return (
    
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Log Out Button */}
      <button
        onClick={handleLogOut}
        className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-semibold transition"
      >
        Log Out
      </button>
      <div className="bg-gradient-to-b from-orange-200 to-transparent p-4">
        <h1 className="text-center text-xl font-semibold text-gray-700 flex items-center justify-center">
          <MdElectricScooter className="mr-2 text-orange-500" /> Book a Ride
        </h1>
        <div className="mt-4 flex justify-center">
          <input
            type="text"
            placeholder="Search scooters or locations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-3/4 max-w-md px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto mt-2 px-4">
        {loading ? (
          <div className="flex justify-center items-center h-40 text-gray-500">
            Loading scooters...
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((s) => (
              <li
                key={s._id}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MdElectricScooter className="text-2xl text-gray-600 mr-4" />
                    <div>
                      <p className="font-medium text-gray-800">{s.scooterName}</p>
                      <p className="text-sm text-gray-500">{s.location.locationName}</p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      s.status === "Available" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                {s.status === "Available" && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleBook(s)}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full font-semibold transition"
                    >
                      Book Now
                    </button>
                  </div>
                )}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="text-center text-gray-500 py-4">
                No scooters match your search.
              </li>
            )}
          </ul>
        )}
      </div>

      <nav className="bg-white border-t border-gray-200 p-2 flex justify-around items-center">
          <button className="flex flex-col items-center text-gray-500">
              <FaHome className="text-xl" />
            <span className="text-xs">Home</span>
          </button>
          <Link to="/book-ride" className="flex flex-col items-center text-gray-500">
          <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="p-3 bg-white rounded-full shadow-lg"
        >
          <MdElectricScooter className="text-4xl text-orange-500 hover:scale-110 transition-transform" />
        </motion.div>
      </Link>


        <Link
          to="/history"
          className="flex flex-col items-center text-gray-500"
        >
          <FaHistory className="text-xl" />
          <span className="text-xs">History</span>
        </Link>
      </nav>
      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
}
