import React, { useState, useEffect, useRef } from 'react';
import { Mic, PhoneOff, Send, Clock } from 'lucide-react';
import { useNavigate } from "react-router-dom";

import {useAudioRecorder} from './useAudioRecorder';
import { sendToDeepgram } from './apiService';
import { processTranscript } from './messagetweaks';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const Interview = () => {  
  // Add Candidate_ID constant at the top with other state declarations
  const Candidate_ID = 12; // You might want to get this from props or URL parameters
  
  // UI State Management
  const [userMessage, setUserMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('Question To Be Asked.');
  const [isLoading, setIsLoading] = useState(false);
  const [countdownTime, setCountdownTime] = useState(60);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [Ranking,SetRanking] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isInterviewEnding, setIsInterviewEnding] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  //Toast Errors
  const toast_during_speech = 'speech-warning';
  const toast_speech_error = 'speech-generation';
  const toast_processing_response = 'processing-response';
  const toast_audio_processing = 'processing-audio';
  const toast_audio_playback = 'audio-playback';
  const toast_during_recording = 'audio_recording';

  // Interview Flow Control
  const [welcomeSent, setWelcomeSent] = useState(false);
  const [QuestionAsked, SetQuestionAsked] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [generateComplete, setGenerateComplete] = useState(false);
  const [compareComplete, setCompareComplete] = useState(false);
  const [isFollowupQuestion, setIsFollowupQuestion] = useState(false);
  const [Coverage, setCoverage] = useState(null);
  const [FollowupCount, SetFollowupCount] = useState(0);
  const [CurrentInput, SetCurrentInput] = useState('');

  // Refs and Hooks
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const { startRecording, stopRecording, error } = useAudioRecorder();

  // Main function to process user responses and generate system responses
  const processUserResponse = async (text, question, additional) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setIsLoading(true);

    try {
      const processedResponse = await processTranscript(text, question, additional, Candidate_ID);

      if(additional=="summary")
      {
        return processedResponse
      }

      let textToSpeak = '';

      // Handle response with coverage information
      if (Array.isArray(processedResponse)) {
        const [filteredResponse, coverage] = processedResponse;
        setCurrentQuestion(filteredResponse);
        setCoverage(coverage);
        textToSpeak = filteredResponse;
      } else {
        setCurrentQuestion(processedResponse);
        textToSpeak = processedResponse;
      }

      // Update interview flow states based on response type
      if (additional === "generate") {
        setGenerateComplete(true);
        setWaitingForInput(true);
      } else if (additional === "compare") {
        setCompareComplete(true);
      } else if (additional === "followup") {
        setWaitingForInput(true);
        setIsFollowupQuestion(true);
      } else if (additional === "comparefollowup") {
        setCompareComplete(true);
        setIsFollowupQuestion(false);
      }

      setIsSpeaking(true);

      // Generate and play audio response
      try {
        const response = await fetch("http://localhost:5000/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textToSpeak }),
        });

        if (!response.ok) throw new Error("Failed to fetch audio");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioSrc(url);
        playAudio(url);
      } catch (error) {
        if (!toast.isActive(toast_speech_error))
        {
          toast.error('Error occured during speech generation.', { toastId: toast_speech_error });
        }
        console.error("Error generating speech:", error);
      }
    } catch (error) {
      if (!toast.isActive(toast_processing_response))
      {
        toast.error('Error occured while processing response.', { toastId: toast_processing_response });
      }
      console.error("Error processing response:", error);
      setCurrentQuestion("Could not generate next question. Please try again.");
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
      SetCurrentInput(additional);
    }
  };

  // Automatic question generation after initial setup
  useEffect(() => {
    let timeoutId;
    if (QuestionAsked === 2 && !isSpeaking && !isProcessing && !generateComplete && !isInterviewEnding) {
      timeoutId = setTimeout(async () => {
        await processUserResponse("0", "0", "generate");
      }, 500);
    }
    return () => clearTimeout(timeoutId);
  }, [QuestionAsked, isSpeaking, isProcessing, generateComplete, isInterviewEnding]);

  // Handle follow-up questions based on coverage
  useEffect(() => {
    let timeoutId;
    if (compareComplete && !isSpeaking && !isProcessing) {
      timeoutId = setTimeout(async () => {
        if (Coverage < 60 && FollowupCount < 3) {
          await processUserResponse("0", currentQuestion, "followup");
          SetFollowupCount(FollowupCount + 1);
          setIsFollowupQuestion(true);
        } else {
          await processUserResponse("0", "0", "next_question");
          SetFollowupCount(0);
          SetQuestionAsked(2);
          setGenerateComplete(false);
          setIsFollowupQuestion(false);
        }
        setCompareComplete(false);
      }, 500);
    }
    return () => clearTimeout(timeoutId);
  }, [compareComplete, isSpeaking, isProcessing, Coverage]);

  // Automatic microphone activation based on conversation state
  useEffect(() => {
    const ToggleSpeaking = async () => {
      // Only proceed if speech has just finished
      if (!isSpeaking) {
        if (CurrentInput === "interview_end") {
          // If mic is on, turn it off
          if (isListening) {
            await handleMicToggle();
          }
          // Get summary without activating mic
          const result = await processUserResponse("0", "0", "summary");
          SetRanking(result);
          return; // Exit early to prevent any mic activation
        }
        
        // Handle other cases where we want to activate mic
        else if (!isListening && 
          !isInterviewEnding && // Add check for interview ending
          (CurrentInput === "welcome" || 
           CurrentInput === "introduction" || 
           CurrentInput === "generate" || 
           CurrentInput === "followup")) {
          await handleMicToggle();
        }
      }
    };

    ToggleSpeaking();
  }, [isSpeaking, CurrentInput, isInterviewEnding]); // Add isInterviewEnding to dependencies

  // Handle microphone toggle and audio processing
  const handleMicToggle = async () => {
    if (isListening) {
      setIsListening(false);
      const audioBlob = await stopRecording();

      if (audioBlob) {
        try {
          const transcriptResult = await sendToDeepgram(audioBlob);
          if (transcriptResult?.results?.channels[0]?.alternatives[0]?.transcript) {
            const newTranscript = transcriptResult.results.channels[0].alternatives[0].transcript;
            setTranscript(newTranscript);

            if (!isProcessing) {
              if (QuestionAsked === 0) {
                await processUserResponse(newTranscript, "0", "introduction");
                SetQuestionAsked(1);
              } else if (QuestionAsked === 1) {
                await processUserResponse(newTranscript, currentQuestion, "start");
                SetQuestionAsked(2);
              } else if (waitingForInput) {
                if (isFollowupQuestion) {
                  await processUserResponse(newTranscript, currentQuestion, "comparefollowup");
                } else {
                  await processUserResponse(newTranscript, "0", "compare");
                }
                setWaitingForInput(false);
              }
            }
          }
        } catch (error) {
          if (!toast.isActive(toast_audio_processing))
          {
            toast.error('Error occured while processing audio.', { toastId: toast_audio_processing });
          }
          console.error('Error processing audio:', error);
        }
      }
    } else {
      setIsListening(true);
      setTranscript('');
      await startRecording();
    }
  };

  // Handle audio playback
  const playAudio = (audioUrl) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio); // Store the audio element
      audio.onended = async () => {
        setIsSpeaking(false);
        setCurrentAudio(null);
      };
      audio.play().catch((err) => {
        console.error("Playback error:", err);
        if (!toast.isActive(toast_audio_playback)) {
          toast.error('Audio playback error', { toastId: toast_audio_playback });
        }
      });
    }
  };

  //Stop Audio playback
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsSpeaking(false);
      setCurrentAudio(null);
    }
  };

  // Text input handlers
  const handleSendMessage = async () => {
    // Only allow sending message if mic is on
    if (userMessage.trim() && !isProcessing && isListening) {
      const message = userMessage;
      setUserMessage("");
      setTranscript(message);
  
      // Turn off mic first
      await handleMicToggle();  // This will stop recording
  
      if (QuestionAsked === 0) {
        await processUserResponse(message, "0", "introduction");
        SetQuestionAsked(1);
      } else if (QuestionAsked === 1) {
        await processUserResponse(message, currentQuestion, "start");
        SetQuestionAsked(2);
      } else if (waitingForInput) {
        if (isFollowupQuestion) {
          await processUserResponse(message, currentQuestion, "comparefollowup");
        } else {
          await processUserResponse(message, "0", "compare");
        }
        setWaitingForInput(false);
      }
    } else if (!isListening) {
      // Show toast message if trying to send without mic on
      if (!toast.isActive('mic-required')) {
        toast.error('Please wait for the microphone to activate before sending.', 
          { toastId: 'mic-required' });
      }
    }
  };

  // Textarea auto-resize handler
  const handleTextareaInput = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    setUserMessage(textarea.value);
  };

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isSpeaking) {
        if (!toast.isActive(toast_during_speech)) {
          toast.error('Please wait for the speech to finish.', 
            { toastId: toast_during_speech });
        }
      } else if (!isListening) {
        if (!toast.isActive('mic-required')) {
          toast.error('Please wait for the microphone to activate before sending.', 
            { toastId: 'mic-required' });
        }
      } else {
        handleSendMessage();
      }
    }
  };

  // Update the handleLeave function to save interview data
const handleLeave = async () => {
  try {
    await saveFinalData(Ranking);
    navigate("/ranking");
  } catch (error) {
    toast.error("Error saving interview data");
    console.error('Error:', error);
  }
};

  // Error handling for recording
  useEffect(() => {
    if (error) {
      console.error('Recording error:', error);
      if (!toast.isActive(toast_during_recording))
      {
        toast.error('An error occured during recording.', { toastId: toast_during_recording });
      }
      setIsListening(false);
      setCurrentQuestion("There was an error with the recording. Please try again.");
    }
  }, [error]);

  // Initialize welcome message
  useEffect(() => {
    if (!welcomeSent) {
      const fetchData = async () => {
        setTimeout( async () => {
          await processUserResponse("0", "0", "welcome");
          setWelcomeSent(true); 
        }, 100);

      };
      fetchData();
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdownTime <= 0 && !isInterviewEnding) {
      const endInterview = async () => {
        setIsInterviewEnding(true);
        
        // Force stop all ongoing processes
        setIsLoading(false);
        setIsProcessing(false);
        setWaitingForInput(false);
        setGenerateComplete(false);
        setCompareComplete(false);
        
        // Stop audio playback if any
        if (isSpeaking) {
          stopAudio();
        }
        
        // Stop microphone if active
        if (isListening) {
          await handleMicToggle();
        }
        
        // Get final evaluation and set it directly
        const result = await processUserResponse("0", "0", "interview_end");
        if (result) {
          setCurrentQuestion(result[3]); // Set the message from result
          SetRanking(result);
        }
      };
  
      endInterview();
      return;
    }
  
    if (countdownTime > 0) {
      const interval = setInterval(() => {
        setCountdownTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
  
      return () => clearInterval(interval);
    }
  }, [countdownTime]);

  // Format time display
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Add FeedbackModal component
  const FeedbackModal = ({ onSubmit }) => {
    const [feedback, setFeedback] = useState('');
  
    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(feedback);
    };
  
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Interview Feedback</h2>
          <p className="text-gray-600 mb-4">
            Please share your feedback about the interview experience:
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

  // Update the saveFinalData function
const saveFinalData = async (rankingsData, feedback = null) => {
  try {
    console.log("Yes i am running too")
    // Get candidate info using the defined Candidate_ID
    const infoResponse = await fetch(`http://localhost:5000/get-candidate-info/${Candidate_ID}`);
    if (!infoResponse.ok) {
      throw new Error('Failed to fetch candidate info');
    }
    const candidateInfo = await infoResponse.json();

    console.log('Saving interview data:', {
      candidateId: Candidate_ID,
      postId: candidateInfo.postId,
      interviewStage: 2
    });

    // Save to interviews table
    const interviewResponse = await fetch("http://localhost:5000/save-interview", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        candidateId: parseInt(Candidate_ID, 10),
        postId: parseInt(candidateInfo.postId, 10),
        interviewStage: 2,
        selected: 'no',
        reportToHr: 'no',
        interviewFeedback: feedback
      }),
    });

    if (!interviewResponse.ok) {
      const errorData = await interviewResponse.json();
      throw new Error(errorData.error || 'Failed to save interview data');
    }

    const result = await interviewResponse.json();
    console.log('Interview saved successfully:', result);
    return result;
  } catch (error) {
    console.error('Error saving final data:', error);
    throw error;
  }
};

  return (
    <div className="relative h-screen bg-gray-100">
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
        {/* Question Display */}
        <div className="w-full max-w-2xl mx-auto px-4 mb-8">
          <div className="bg-white shadow-lg rounded-xl p-6 text-center">
            {isLoading ? (
              <div className="h-20 w-20 flex justify-center items-center mx-auto">
                <div className="w-10 h-10 border-4 border-t-4 border-gray-400 border-t-blue-500 border-solid rounded-full animate-spin"></div>
              </div>
            ) : (
              <p className="text-2xl font-medium text-gray-800">
                {currentQuestion}
              </p>
            )}
          </div>
        </div>

        {/* Microphone and Transcript */}
        <div className="flex flex-col items-center gap-8">
          <button
            onClick={handleMicToggle}
            disabled={isLoading || isSpeaking}
            className={`p-6 rounded-full transition-all duration-200 ${
              isListening 
                ? 'bg-green-500 hover:bg-green-600 scale-110' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {isListening ? (
              <Mic className="w-8 h-8 text-white animate-pulse" />
            ) : (
              <Mic className="w-8 h-8 text-gray-700" />
            )}
          </button>

          {transcript && (
            <div className="w-full max-w-2xl mx-auto px-4">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-gray-700">{transcript}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Text Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-200">
        <div className="p-4">
          <div className="w-full max-w-2xl mx-auto flex items-end space-x-2">
            <textarea
              ref={textareaRef}
              value={userMessage}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              style={{overflow: "hidden"}}
              placeholder="Type your response..."
              className="flex-grow p-2 border rounded-lg min-h-[40px] max-h-[200px] resize-none overflow-y-auto"
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || isSpeaking || !isListening}
              className={`bg-blue-500 text-white p-2 rounded-lg h-[40px] ${
                (!isListening || isSpeaking) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Leave Button */}
      <div className="fixed bottom-3 right-6 flex space-x-2">
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="p-2 bg-red-500 rounded-full"
        >
          <PhoneOff color="white" />
        </button>
      </div>

      {/* Leave Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Leave Interview?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to end the interview? Any unsaved responses will be lost.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Stay
              </button>
              <button
                onClick={handleLeave}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Show Ranking after interview */}
        {Ranking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Blurred backdrop */}
            <div className="absolute inset-0 backdrop-blur-md bg-black/30" />
          
            {/* Modal content */}
            <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              {/* Decorative elements */}
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl" />
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />
            
              {/* Content */}
              <div className="relative">
                <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
                  Thank you for attending.
                </h2>
                <div className="bg-gray-50 rounded-xl border border-gray-100 shadow-sm mb-8">
                  <p className="text-gray-600 text-lg leading-relaxed p-6 tracking-tight">
                    {Ranking[3]}
                  </p>
                </div>
              
                {/* Score meters */}
                <div className="space-y-6 mb-8">
                  {/* Fluency Score */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Fluency</span>
                      <span className="text-sm font-semibold text-gray-800">{Ranking[0]}/10</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out"
                        style={{ width: `${(parseFloat(Ranking[0]) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                
                  {/* Subject Score */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Subject Knowledge</span>
                      <span className="text-sm font-semibold text-gray-800">{Ranking[1]}/10</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-1000 ease-out"
                        style={{ width: `${(parseFloat(Ranking[1]) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                
                  {/* Behavior Score */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Professional Behavior</span>
                      <span className="text-sm font-semibold text-gray-800">{Ranking[2]}/10</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-1000 ease-out"
                        style={{ width: `${(parseFloat(Ranking[2]) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                {/* Action buttons */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={async () => {
                      try {
                        await saveFinalData(Ranking);
                        toast.success("Interview data saved successfully!");
                        navigate("/ranking");
                      } catch (error) {
                        toast.error("Error saving interview data");
                        console.error('Error:', error);
                      }
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/30"
                  >
                    Complete Interview
                  </button>
                  <button
                    onClick={() => setShowFeedbackModal(true)}
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
                const finalData = await saveFinalData(Ranking, feedback);
                console.log("Yes i am running..")
                toast.success("Interview data and feedback saved successfully!");
                setShowFeedbackModal(false);
                navigate("/ranking");
              } catch (error) {
                toast.error("Error saving interview data");
                console.error('Error:', error);
              }
            }}
          />
        )}
        <ToastContainer position="top-left" autoClose={3000} />
    </div>
  );
};