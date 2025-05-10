import React from "react";
import { Outlet, Link } from "react-router-dom";
import { MdElectricScooter } from "react-icons/md";
import { motion } from "framer-motion";
import "./App.css";
import welcomelogo from "../public/welcomelogo.svg";
import welcomeland from "../public/welcomeland.svg";

function App() {
  return (
    <div className="relative flex flex-col h-screen w-full bg-white">
      <div className="flex flex-col items-center justify-center flex-grow">
        <div className="mb-4">
          <img src={welcomelogo} alt="Logo" />
        </div>
        <div className="w-60 h-60">
          <img
            src={welcomeland}
            alt="Scooter Illustration"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <Link
        to="/login"
        className="bg-orange-500 py-4 text-center mx-auto w-[90%] rounded-full mb-5"
      >
        <button className="text-white font-semibold text-lg">
          Get Started
        </button>
      </Link>

      {/*<Link to="/book-ride" className="absolute bottom-24 right-6">
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="p-2 bg-white rounded-full shadow-lg"
        >
          <MdElectricScooter className="text-4xl text-orange-500 hover:scale-110 transition-transform" />
        </motion.div>
      </Link>*/}

      <Outlet />
    </div>
  );
}

export default App;
