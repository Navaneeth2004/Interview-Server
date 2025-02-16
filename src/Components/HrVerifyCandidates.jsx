import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Calendar, CheckCircle, X, Star, Brain, MessageSquare } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const categories = ['Java', 'C#', 'Python', 'JavaScript', 'Ruby', 'Go'];
const examTypes = ['Interview', 'MCQ'];

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
    {children}
  </div>
);

export const HrVerifyCandidates = () => {
  const { postId } = useParams();
  const [candidates, setCandidates] = useState({ mcq: [], interview: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [isPostCreated, setIsPostCreated] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [interviewStage, setInterviewStage] = useState(0);
  const [newPostFormData, setNewPostFormData] = useState({
    title: '',
    description: '',
    category: '',
    followupCount: '',
    totalTime: '',
    coverageNeeded: '',
    examType: '',
    testStartDate: ''
  });
  const [conversations, setConversations] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [mcqResults, setMcqResults] = useState([]);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch(`http://localhost:5000/get-reportable-candidates/${postId}`);
        if (!response.ok) throw new Error('Failed to fetch candidates');
        const data = await response.json();
        setCandidates(data);
      } catch (err) {
        setError(err.message);
        toast.error('Error fetching candidates');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [postId]);

  // Update the useEffect for checking recruitment status
  useEffect(() => {
    const checkRecruitmentStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5000/check-recruitment-status/${postId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to check recruitment status');
        }
        const data = await response.json();
        setIsPostCreated(data.isCompleted); // Use isCompleted to control both buttons
      } catch (err) {
        console.error('Status check error:', err);
        toast.error('Failed to check recruitment status');
      }
    };

    checkRecruitmentStatus();
  }, [postId]);

  // Add useEffect to get interview stage
  useEffect(() => {
    const fetchInterviewStage = async () => {
      try {
        const response = await fetch(`http://localhost:5000/get-interview-stage/${postId}`);
        if (!response.ok) throw new Error('Failed to fetch interview stage');
        const data = await response.json();
        setInterviewStage(data.stage);
      } catch (err) {
        console.error('Error fetching interview stage:', err);
      }
    };

    fetchInterviewStage();
  }, [postId]);

  // Update the useEffect for fetching data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch conversations
        const conversationsResponse = await fetch(`http://localhost:5000/get-conversation/${postId}`);
        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          setConversations(Array.isArray(conversationsData) ? conversationsData : [conversationsData]);
        }

        // Fetch rankings
        const rankingsResponse = await fetch(`http://localhost:5000/get-rankings/${postId}`);
        if (rankingsResponse.ok) {
          const rankingsData = await rankingsResponse.json();
          setRankings(Array.isArray(rankingsData) ? rankingsData : [rankingsData]);
        }

        // Fetch MCQ results
        const mcqResponse = await fetch(`http://localhost:5000/get-mcq-results/${postId}`);
        if (mcqResponse.ok) {
          const mcqData = await mcqResponse.json();
          setMcqResults(Array.isArray(mcqData) ? mcqData : [mcqData]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [postId]);

  const handleCheckboxChange = (candidateId) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const handleSelect = async () => {
    try {
      const response = await fetch('http://localhost:5000/update-selected-candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateIds: Array.from(selectedCandidates),
          postId: parseInt(postId),
          action: 'select'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update selected candidates');
      }
      
      toast.success('Successfully updated selected candidates');
      
      // Refresh the candidates list
      const updatedResponse = await fetch(`http://localhost:5000/get-reportable-candidates/${postId}`);
      if (!updatedResponse.ok) {
        throw new Error('Failed to refresh candidates');
      }
      
      const updatedData = await updatedResponse.json();
      setCandidates(updatedData);
      setSelectedCandidates(new Set());
      
    } catch (err) {
      console.error('Selection error:', err);
      toast.error(err.message || 'Failed to update selected candidates');
    }
  };

  // Update the handleEndRecruitment function
  const handleEndRecruitment = async () => {
    try {
      const response = await fetch('http://localhost:5000/end-recruitment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postId: parseInt(postId) })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to end recruitment');
      }
      
      toast.success('Recruitment process ended successfully');
      setIsPostCreated(true); // Set this to true to disable both buttons
      
      // Refresh the candidates list to show updated status
      const updatedResponse = await fetch(`http://localhost:5000/get-reportable-candidates/${postId}`);
      if (!updatedResponse.ok) {
        throw new Error('Failed to refresh candidates');
      }
      const updatedData = await updatedResponse.json();
      setCandidates(updatedData);
      
    } catch (err) {
      console.error('End recruitment error:', err);
      toast.error(err.message || 'Failed to end recruitment');
    }
  };

  const getUnselectedCount = () => {
    return Array.from(selectedCandidates).filter(id => {
      const mcqCandidate = candidates.mcq.find(c => c.interview_id === id);
      const interviewCandidate = candidates.interview.find(c => c.interview_id === id);
      const candidate = mcqCandidate || interviewCandidate;
      return candidate && candidate.selected !== 'yes';
    }).length;
  };

  const handleDeselect = async () => {
    try {
      const response = await fetch('http://localhost:5000/update-selected-candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateIds: Array.from(selectedCandidates),
          postId: parseInt(postId),
          action: 'deselect'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to deselect candidates');
      }
      
      toast.success('Successfully deselected candidates');
      
      // Refresh the candidates list
      const updatedResponse = await fetch(`http://localhost:5000/get-reportable-candidates/${postId}`);
      if (!updatedResponse.ok) {
        throw new Error('Failed to refresh candidates');
      }
      
      const updatedData = await updatedResponse.json();
      setCandidates(updatedData);
      setSelectedCandidates(new Set());
      
    } catch (err) {
      console.error('Deselection error:', err);
      toast.error(err.message || 'Failed to deselect candidates');
    }
  };

  // Update handleNewRecruitment function
  const handleNewRecruitment = async () => {
    try {
      // First update the candidates table
      const updateResponse = await fetch('http://localhost:5000/new-recruitment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          postId: parseInt(postId),
          candidateIds: candidates.mcq.concat(candidates.interview)
            .map(c => c.candidate_id)
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to start new recruitment');
      }

      setIsCreateModalOpen(true);
    } catch (err) {
      console.error('New recruitment error:', err);
      toast.error(err.message || 'Failed to start new recruitment');
    }
  };

  // Add handler for post creation completion
  const handlePostCreationComplete = () => {
    setIsCreateModalOpen(false);
    setIsPostCreated(true);
    toast.success('New recruitment process started');
  };

  // Add helper function for form input handling
  const handleNewPostInputChange = (e) => {
    const { name, value } = e.target;
    let validatedValue = value;
  
    if (name === 'examType' && value === 'MCQ') {
      setNewPostFormData(prev => ({
        ...prev,
        [name]: value,
        followupCount: '',
        coverageNeeded: ''
      }));
      return;
    }
  
    const numericFields = ['minExperience', 'followupCount', 'totalTime', 'coverageNeeded'];
    if (numericFields.includes(name)) {
      if (!/^\d*$/.test(value)) return;
      const numValue = parseInt(value) || 0;
      switch (name) {
        case 'minExperience':
          validatedValue = Math.min(Math.max(0, numValue), 50);
          break;
        case 'followupCount':
          validatedValue = Math.min(Math.max(0, numValue), 10);
          break;
        case 'totalTime':
          validatedValue = Math.min(Math.max(1, numValue), 300);
          break;
        case 'coverageNeeded':
          validatedValue = Math.min(Math.max(0, numValue), 100);
          break;
        default:
          break;
      }
    }
  
    setNewPostFormData(prev => ({
      ...prev,
      [name]: validatedValue
    }));
  };

  // Update the handleNewPostSubmit function
const handleNewPostSubmit = async (e) => {
  e.preventDefault();
  try {
    // 1. First mark current post as completed
    const endRecruitmentResponse = await fetch('http://localhost:5000/end-recruitment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ postId: parseInt(postId) })
    });

    if (!endRecruitmentResponse.ok) {
      throw new Error('Failed to end current recruitment');
    }

    // 2. Get currently selected candidates before creating new post
    const selectedCandidateIds = [
      ...candidates.mcq,
      ...candidates.interview
    ].filter(c => c.selected === 'yes')
      .map(c => c.candidate_id);

    // 3. Create new post
    const createPostResponse = await fetch('http://localhost:5000/save-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: newPostFormData.title,
        description: newPostFormData.description,
        category: newPostFormData.category,
        exam_type: newPostFormData.examType,
        followup: newPostFormData.examType === 'MCQ' ? null : parseInt(newPostFormData.followupCount),
        coverage: newPostFormData.examType === 'MCQ' ? null : parseInt(newPostFormData.coverageNeeded),
        time: parseInt(newPostFormData.totalTime),
        test_start_date: newPostFormData.testStartDate,
        reset_status: true // Add this flag to indicate this is a new post
      })
    });

    if (!createPostResponse.ok) {
      throw new Error('Failed to create new post');
    }

    const data = await createPostResponse.json();
    
    // 4. Create interviews for selected candidates in new post with reset statuses
    if (selectedCandidateIds.length > 0) {
      const newRecruitmentResponse = await fetch('http://localhost:5000/new-recruitment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId: data.post_id,
          candidateIds: selectedCandidateIds,
          currentPostId: parseInt(postId),
          isNewPost: true  // Add this flag to indicate it's a new post
        })
      });

      if (!newRecruitmentResponse.ok) {
        throw new Error('Failed to create interviews for selected candidates');
      }
    }

    // 5. Update UI state
    localStorage.setItem(`post_${postId}_completed`, 'true');
    setIsPostCreated(true);
    setIsCreateModalOpen(false);
    toast.success('New recruitment process started with selected candidates');
    
    // 6. Refresh candidates list
    const updatedResponse = await fetch(`http://localhost:5000/get-reportable-candidates/${postId}`);
    if (!updatedResponse.ok) {
      throw new Error('Failed to refresh candidates');
    }
    const updatedData = await updatedResponse.json();
    setCandidates(updatedData);
    
  } catch (err) {
    console.error('New recruitment error:', err);
    toast.error(err.message || 'Failed to start new recruitment');
  }
};

  // Add this useEffect to check localStorage on component mount
  useEffect(() => {
    const isCompleted = localStorage.getItem(`post_${postId}_completed`) === 'true';
    setIsPostCreated(isCompleted);
  }, [postId]);

  // Update the renderResultCards function
const renderResultCards = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    {/* MCQ Results Card */}
    {mcqResults?.length > 0 && (
      <Card className="col-span-1">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">MCQ Results</h2>
          </div>
          <div className="space-y-4">
            {mcqResults.map((result, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800">{result.candidateName}</h3>
                <div className="mt-2">
                  <div className="mt-2 space-y-2">
                    {result.mcqResponses.map((response, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="font-medium text-gray-700">{response.question}</p>
                        <p className={`ml-4 ${response.selectedAnswer === response.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
                          Answer: {response.selectedAnswer}
                          {response.selectedAnswer !== response.correctAnswer && 
                            ` (Correct: ${response.correctAnswer})`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )}

    {/* Rankings Card */}
    {rankings?.length > 0 && (
      <Card className="col-span-1">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-6 h-6 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-800">Interview Rankings</h2>
          </div>
          <div className="space-y-4">
            {rankings.map((ranking, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800">{ranking.candidateName}</h3>
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-gray-600">
                    Fluency: {ranking.scores.fluency}
                  </p>
                  <p className="text-sm text-gray-600">
                    Subject Knowledge: {ranking.scores.subjectKnowledge}
                  </p>
                  <p className="text-sm text-gray-600">
                    Professional Behavior: {ranking.scores.professionalBehavior}
                  </p>
                  {ranking.feedback && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      Feedback: "{ranking.feedback}"
                    </p>
                  )}
                  {ranking.panelReview && (
                    <p className="text-sm text-gray-600">
                      Panel Review: "{ranking.panelReview.text}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )}

    {/* Conversations Card */}
    {conversations?.length > 0 && (
      <Card className="col-span-2">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-800">Interview Conversations</h2>
          </div>
          <div className="space-y-4">
            {conversations.map((conversation, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800">Interview Transcript</h3>
                <div className="mt-2 space-y-2">
                  {Object.entries(conversation)
                    .filter(([key]) => !['candidateName', 'candidateId', 'postId', 'date'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-gray-700">{key}:</span>
                        <p className="text-gray-600 ml-4">{value}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )}
  </div>
);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {renderResultCards()}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Verify Candidates
              <span className="ml-4 text-lg font-medium text-gray-600">
                Stage {interviewStage}
              </span>
            </h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleSelect}
              disabled={selectedCandidates.size === 0 || isPostCreated}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
                ${(selectedCandidates.size === 0 || isPostCreated)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              Select ({getUnselectedCount()})
            </button>
            <button
              onClick={handleDeselect}
              disabled={selectedCandidates.size === 0 || isPostCreated}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
                ${(selectedCandidates.size === 0 || isPostCreated)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
            >
              Deselect ({selectedCandidates.size})
            </button>
            <button
              onClick={handleEndRecruitment}
              disabled={isPostCreated}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
                ${isPostCreated
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
              End Recruitment
            </button>
            <button
              onClick={handleNewRecruitment}
              disabled={isPostCreated}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
                ${isPostCreated
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              New Recruitment
            </button>
          </div>
        </div>
      </div>

      {/* MCQ Candidates */}
      {candidates.mcq.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">MCQ Candidates</h2>
          <div className="space-y-4">
            {candidates.mcq.map(candidate => (
              <div key={candidate.interview_id} 
                className="bg-white rounded-xl p-6 border border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{candidate.candidate_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(candidate.createdat).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium 
                    ${candidate.selected === 'yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {candidate.selected === 'yes' ? 'Selected' : 'Not Selected'}
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedCandidates.has(candidate.interview_id)}
                    onChange={() => handleCheckboxChange(candidate.interview_id)}
                    disabled={isPostCreated}
                    className={`w-5 h-5 text-blue-600 rounded focus:ring-blue-500 
                      ${isPostCreated ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interview Candidates */}
      {candidates.interview.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Interview Candidates</h2>
          <div className="space-y-4">
            {candidates.interview.map(candidate => (
              <div key={candidate.interview_id} 
                className="bg-white rounded-xl p-6 border border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{candidate.candidate_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(candidate.createdat).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium 
                    ${candidate.selected === 'yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {candidate.selected === 'yes' ? 'Selected' : 'Not Selected'}
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedCandidates.has(candidate.interview_id)}
                    onChange={() => handleCheckboxChange(candidate.interview_id)}
                    disabled={isPostCreated}
                    className={`w-5 h-5 text-blue-600 rounded focus:ring-blue-500 
                      ${isPostCreated ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 rounded-xl p-8 w-full max-w-3xl m-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Create New Job Post</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleNewPostSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title field */}
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={newPostFormData.title}
                    onChange={handleNewPostInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Description field */}
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={newPostFormData.description}
                    onChange={handleNewPostInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    name="category"
                    value={newPostFormData.category}
                    onChange={handleNewPostInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Exam Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Type</label>
                  <select
                    name="examType"
                    value={newPostFormData.examType}
                    onChange={handleNewPostInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Exam Type</option>
                    {examTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Total Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Total Time (minutes)</label>
                  <input
                    type="number"
                    name="totalTime"
                    value={newPostFormData.totalTime}
                    onChange={handleNewPostInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="300"
                    required
                  />
                </div>

                {/* Follow-up Questions - Always visible but conditionally disabled */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Follow-up Questions</label>
                  <input
                    type="number"
                    name="followupCount"
                    value={newPostFormData.followupCount}
                    onChange={handleNewPostInputChange}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      ${newPostFormData.examType === 'MCQ' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    min="0"
                    max="10"
                    required={newPostFormData.examType === 'Interview'}
                    disabled={newPostFormData.examType === 'MCQ'}
                  />
                </div>

                {/* Coverage Needed - Always visible but conditionally disabled */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Coverage Needed (%)</label>
                  <input
                    type="number"
                    name="coverageNeeded"
                    value={newPostFormData.coverageNeeded}
                    onChange={handleNewPostInputChange}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      ${newPostFormData.examType === 'MCQ' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    min="0"
                    max="100"
                    required={newPostFormData.examType === 'Interview'}
                    disabled={newPostFormData.examType === 'MCQ'}
                  />
                </div>

                {/* Test Start Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Test Start Date</label>
                  <input
                    type="date"
                    name="testStartDate"
                    value={newPostFormData.testStartDate}
                    onChange={handleNewPostInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" />
    </div>
  );
};
