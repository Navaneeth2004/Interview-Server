import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Clock, PhoneOff } from 'lucide-react';
import { mcqQuestions } from '../Assets/Files/MCQ.js';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const InterviewMCQ = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [countdownTime, setCountdownTime] = useState(120); // Change to 120 for 2 minutes
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Add new state for controlling flow

  const Candidate_ID = 1;

  const navigate = useNavigate();

  const toast_during_save = 'save-warning';

  useEffect(() => {
    if (showSuccessModal || showFeedbackModal) return; // Don't run timer if modals are shown

    const timer = setInterval(() => {
      setCountdownTime((prevTime) => {
        // Calculate warning points based on current time
        if (prevTime === 120/2) { // Half time (60 seconds)
          toast.warning("1 minute remaining!", {
            toastId: 'half-time-warning'
          });
        } else if (prevTime === 120/4) { // Quarter time (30 seconds)
          toast.warning("30 seconds remaining!", {
            toastId: 'quarter-time-warning'
          });
        } else if (prevTime === 10) { // Last 10 seconds
          toast.warning("Only 10 seconds remaining!", {
            toastId: 'ten-sec-warning'
          });
        }

        if (prevTime <= 1) {
          clearInterval(timer);
          toast.info("Time's up! Submitting your answers...", {
            toastId: 'time-up'
          });
          saveMCQResponses(answers);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [answers, showSuccessModal, showFeedbackModal]);

  useEffect(() => {
    const currentAnswer = answers.find(
      answer => answer.question === mcqQuestions[currentQuestionIndex].question
    );
    setSelectedOption(currentAnswer ? currentAnswer.selectedAnswer : null);
  }, [currentQuestionIndex, answers]);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const handleNextQuestion = () => {
    if (selectedOption !== null) {
      const updatedAnswers = answers.filter(
        answer => answer.question !== mcqQuestions[currentQuestionIndex].question
      );
      const newAnswers = [
        ...updatedAnswers,
        { question: mcqQuestions[currentQuestionIndex].question, selectedAnswer: selectedOption }
      ];
      setAnswers(newAnswers);
      setSelectedOption(null);
      
      if (currentQuestionIndex < mcqQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        saveMCQResponses(newAnswers);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleLeave = () => {
    saveMCQResponses(answers);
  };

  const saveMCQResponses = async (responses) => {
    try {
      // First, get candidate info
      const infoResponse = await fetch(`http://localhost:5000/get-candidate-info/${Candidate_ID}`);
      if (!infoResponse.ok) throw new Error(`HTTP error! status: ${infoResponse.status}`);
      const candidateInfo = await infoResponse.json();

      // First save the interview record
      const interviewData = {
        candidateId: parseInt(Candidate_ID, 10),
        postId: candidateInfo.postId,
        interviewStage: 1,
        selected: 'no',
        report_to_hr: 'no'
      };

      const interviewResponse = await fetch("http://localhost:5000/save-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interviewData),
      });

      if (!interviewResponse.ok) throw new Error('Failed to save interview data');
      const interviewResult = await interviewResponse.json();

      // Then save MCQ responses
      const mcqData = {
        candidateName: candidateInfo.candidateName,
        candidateId: parseInt(Candidate_ID, 10),
        postId: candidateInfo.postId,
        mcqResponses: responses.map(response => ({
          question: response.question,
          selectedAnswer: response.selectedAnswer,
          correctAnswer: mcqQuestions.find(q => q.question === response.question)?.correctAnswer || "Unknown"
        }))
      };

      const mcqResponse = await fetch("http://localhost:5000/save-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mcqData)
      });

      if (!mcqResponse.ok) throw new Error(`HTTP error! status: ${mcqResponse.status}`);
      const mcqResult = await mcqResponse.json();

      setSubmissionStatus({
        status: "success",
        interviewId: interviewResult.interviewId
      });
      setShowSuccessModal(true);
      setCountdownTime(0);

      return interviewResult;

    } catch (error) {
      if (!toast.isActive(toast_during_save)) {
        toast.error("Error saving MCQ responses.", { toastId: toast_during_save });
      }
      console.error("Error saving MCQ responses:", error);
      throw error;
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-100">
      {/* Timer Display */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white shadow-md rounded-lg px-4 py-2 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-red-500" />
          <span className="text-lg font-semibold text-red-600">
            {formatTime(countdownTime)}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Question {currentQuestionIndex + 1} of {mcqQuestions.length}</h2>
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / mcqQuestions.length) * 100}%` }}
              />
            </div>
          </div>
          
          <h3 className="text-xl text-gray-700 mb-6">{mcqQuestions[currentQuestionIndex].question}</h3>
          
          <div className="space-y-4">
            {mcqQuestions[currentQuestionIndex].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedOption === option 
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                currentQuestionIndex === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={selectedOption === null}
              className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                selectedOption === null
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {currentQuestionIndex < mcqQuestions.length - 1 ? 'Next' : 'Finish'}
            </button>
          </div>
        </div>
      </div>

      {/* Leave Button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="p-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors duration-200"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Leave Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Leave Test?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to end the test? Your progress will be saved.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors duration-200"
              >
                Stay
              </button>
              <button
                onClick={handleLeave}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Completion Status */}
      {submissionStatus && showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-md bg-black/30" />
          <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl" />
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />
            
            <div className="relative">
              <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
                Test Submitted Successfully!
              </h2>
              
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 text-green-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              
              <p className="text-center text-gray-600 mb-8">
                Your test responses have been successfully submitted.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={async () => {
                    try {
                      await saveMCQResponses(answers);
                      navigate("/mcqranking");
                    } catch (error) {
                      toast.error("Error saving data");
                      console.error('Error:', error);
                    }
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/30"
                >
                  Complete Test
                </button>
                <button
                  onClick={async () => {
                    try {
                      await saveMCQResponses(answers);
                      setShowSuccessModal(false);
                      setShowFeedbackModal(true);
                    } catch (error) {
                      toast.error("Error saving data");
                      console.error('Error:', error);
                    }
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/30"
                >
                  Provide Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showFeedbackModal && (
        <FeedbackModal
          onSubmit={async (feedback) => {
            try {
              const response = await fetch("http://localhost:5000/save-mcq-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  interviewId: submissionStatus.interviewId,
                  feedback
                }),
              });
      
              if (!response.ok) {
                throw new Error("Failed to save feedback");
              }
      
              const result = await response.json();
              toast.success("Feedback submitted successfully");
              setShowFeedbackModal(false);
              navigate("/mcqranking");
            } catch (error) {
              toast.error("Error saving feedback");
              console.error(error);
            }
          }}
        />
      )}
      <ToastContainer position="top-left" autoClose={3000} />
    </div>
  );
};

const FeedbackModal = ({ onSubmit }) => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(feedback);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Test Feedback</h2>
        <p className="text-gray-600 mb-4">
          Please share your feedback about the test experience:
        </p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
            placeholder="Your feedback here..."
            required
          />
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
          >
            Submit Feedback
          </button>
        </form>
      </div>
    </div>
  );
};