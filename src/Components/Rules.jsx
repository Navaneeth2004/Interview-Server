import React, { useState, useEffect } from 'react';
import { Mic, CheckCircle } from 'lucide-react';
import ruletext from '../Assets/Files/Rules.txt?raw';
import { useNavigate } from "react-router-dom";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Rules component for displaying interview rules and handling permissions
export const Rules = () => {
  const [heading, setHeading] = useState('');
  const [rules, setRules] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);

  const navigate = useNavigate();

  const toast_during_permission = 'permission-warning';

  // Parse rules text and set up initial state
  useEffect(() => {
    document.title = 'Interview Rules';

    const headingMatch = ruletext.match(/heading=(.+)/);
    if (headingMatch) setHeading(headingMatch[1]);

    const rulesMatch = ruletext.match(/para=(.+)/g);
    if (rulesMatch) {
      const cleanRules = rulesMatch.map(rule => rule.replace('para=', ''));
      setRules(cleanRules);
    }
  }, []);

  // Request microphone permissions from the user
  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      localStorage.setItem("micPermission", "true");

      const audio = new Audio();
      audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
      audio.play().catch(error => console.log("Silent audio blocked:", error));

      toast.success('Microphone access granted. You are ready to begin!');
    } catch (error) {
      if (!toast.isActive(toast_during_permission)) {
        toast.error('Microphone permission is required to proceed.', { toastId: toast_during_permission });
      }
      console.log("Error Occurred While Requesting Permission: ", error);
      setHasPermission(false);
    }
  };

  // Handle entering the interview
  const handleEnterInterview = () => {
    if (!hasPermission) {
      requestPermissions();
    } else {
      navigate("/mcq");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8 border-b pb-4">
          {heading}
        </h1>

        {/* Rules Display */}
        <div className="space-y-6">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <p 
                className="text-lg text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: rule }}
              />
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-4">
          {/* Permission Request Button */}
          {!hasPermission && (
            <button
              onClick={requestPermissions}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <Mic className="w-5 h-5" />
              <span>Grant Mic Access</span>
            </button>
          )}

          {/* Enter Interview Button */}
          <button
            onClick={handleEnterInterview}
            className={`w-full flex items-center justify-center gap-2 ${
              hasPermission
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-400 cursor-not-allowed'
            } text-white font-semibold py-3 px-6 rounded-lg transition-colors`}
            disabled={!hasPermission}
          >
            <span>Enter Interview</span>
          </button>
        </div>

        {/* Permission Status Message */}
        {hasPermission && (
          <div className="mt-4 flex items-center justify-center gap-2 text-green-600 font-medium">
            <CheckCircle className="w-5 h-5" />
            <span>Permissions granted - Ready to begin</span>
          </div>
        )}
      </div>
      <ToastContainer position="top-left" autoClose={3000} />
    </div>
  );
};
