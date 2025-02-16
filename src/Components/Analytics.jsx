import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, Calendar, Star, Brain, UserCheck, TrendingUp, X, MessageSquare } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const RankingsAnalytics = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [topN, setTopN] = useState(5); // Number of top performers to highlight
  const [sortedRankings, setSortedRankings] = useState([]);
  const [reviews, setReviews] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentReviewCandidate, setCurrentReviewCandidate] = useState(null);
  const [showReportConfirm, setShowReportConfirm] = useState(false); // Add new state for confirmation dialog
  const [hasReported, setHasReported] = useState(false); // Add new state for tracking report status

  const threshold = 7; // Threshold for success rate

  const Post_ID = 15;

  const toast_during_ranks = 'rank-warning';
  const toast_during_conversation = 'conversation-warning';

  // Update the fetchRankings function
  const fetchRankings = async () => {
    try {
      // Fetch rankings
      const response = await fetch(`http://localhost:5000/get-rankings/${Post_ID}`);
      if (!response.ok) throw new Error('Failed to fetch rankings');
      const data = await response.json();
      const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRankings(sortedData);

      // Check report status
      const reportStatusResponse = await fetch(`http://localhost:5000/check-report-status/${Post_ID}`);
      if (!reportStatusResponse.ok) throw new Error('Failed to check report status');
      const { hasReported } = await reportStatusResponse.json();
      setHasReported(hasReported);

    } catch (err) {
      if (!toast.isActive(toast_during_ranks)) {
        toast.error('Error occurred while fetching data.', { toastId: toast_during_ranks });
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update useEffect to use the moved function
  useEffect(() => {
    fetchRankings();
  }, []);

  useEffect(() => {
    if (rankings.length > 0) {
      const sorted = [...rankings].sort((a, b) => {
        const avgA = Object.values(a.scores).reduce((sum, score) => sum + score, 0) / 3;
        const avgB = Object.values(b.scores).reduce((sum, score) => sum + score, 0) / 3;
        return avgB - avgA;
      });
      setSortedRankings(sorted);
    }
  }, [rankings]);

  const fetchConversation = async (ranking) => {
    try {
      const dateObj = new Date(ranking.date);
      const day = dateObj.getDate();
      const month = dateObj.getMonth() + 1;
      const year = dateObj.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;
      
      const response = await fetch(
        `http://localhost:5000/get-conversation/${Post_ID}/${ranking.candidateId}_${formattedDate}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch conversation');
      const data = await response.json();
      setSelectedConversation(data);
      setShowModal(true);
    } catch (err) {
      if (!toast.isActive(toast_during_conversation)) {
        toast.error('Error occurred while fetching conversation.', { 
          toastId: toast_during_conversation 
        });
      }
      console.error('Error fetching conversation:', err);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(sortedRankings);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSortedRankings(items);
  };

  // Update handleReportToHR function
  const handleReportToHR = async () => {
    try {
      const topCandidates = sortedRankings.slice(0, topN);
      
      if (topCandidates.length === 0) {
        toast.warning("No candidates to report");
        return;
      }

      const candidateIds = topCandidates.map(c => parseInt(c.candidateId, 10));
      console.log('Reporting candidates:', candidateIds);

      // Calculate actual number of candidates being reported
      const actualCandidateCount = Math.min(topCandidates.length, topN);
  
      const response = await fetch("http://localhost:5000/report-to-hr", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          postId: parseInt(Post_ID, 10),
          candidateIds: candidateIds
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to report to HR');
      }
  
      toast.success(`Successfully reported ${actualCandidateCount} candidate${actualCandidateCount > 1 ? 's' : ''} to HR`);
      setShowReportConfirm(false);
      setHasReported(true); // Set reported status to true after successful report
  
      // Refresh rankings to show updated status
      await fetchRankings();
    } catch (error) {
      console.error('Error reporting to HR:', error);
      toast.error(error.message || "Failed to report to HR");
    }
  };

  const ConversationModal = ({ conversation, onClose }) => {
    if (!conversation) return null;

    const renderMessage = (content, key) => {
      const isInterviewer = !key.toLowerCase().includes('candidate');
      
      let coverageScore = null;
      let displayContent = content;
      if (key.includes('Question_Feedback')) {
        const match = content.match(/Coverage=(\d+)/);
        if (match) {
          coverageScore = parseInt(match[1], 10);
          displayContent = content.replace(/Coverage=\d+/, '').trim();
        }
      }

      return (
        <div key={key} className={`mb-4 rounded-xl ${isInterviewer ? 'bg-blue-50' : 'bg-gray-50'} backdrop-blur-sm`}>
            <div className="p-4">
                {/* Flexbox container for alignment */}
                <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-600 font-medium">
                    {key.replace(/_/g, ' ')}
                </div>
                {coverageScore !== null && (
                    <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    Coverage: {coverageScore}
                    </div>
                )}
                </div>

                <div className="text-gray-800 whitespace-pre-wrap">
                {displayContent}
                </div>
            </div>
        </div>
      );
    };

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Interview Conversation
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            {Object.entries(conversation).map(([key, value]) => renderMessage(value, key))}
          </div>
        </div>
      </div>
    );
  };

  const ReviewModal = ({ candidateId, onClose, onSubmit }) => {
    const [reviewText, setReviewText] = useState(reviews[candidateId]?.text || '');

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(candidateId, reviewText);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Write Review</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Write your review here..."
              required
            />
            <div className="flex justify-end mt-4 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Review
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-gray-600">
      <div className="animate-pulse">Loading rankings...</div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-800">
          <TrendingUp className="w-8 h-8 text-blue-500" />
          Interview Analytics
        </h1>
        <button
          onClick={() => setShowReportConfirm(true)}
          disabled={hasReported}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200
            ${hasReported 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-green-600 text-white hover:bg-green-700'
            }`}
        >
          <User className="w-5 h-5" />
          {hasReported ? 'Reported to HR' : 'Report to HR'}
        </button>
      </div>

      {showReportConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Confirm Report to HR</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to report the top {topN} candidates to HR? This action will mark their interviews for HR review.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReportConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReportToHR}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200"
              >
                Confirm Report
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Interview Score Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={rankings}>
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString()} 
              stroke="#94a3b8"
            />
            <YAxis domain={[0, 10]} stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="scores.fluency" 
              stroke="#3b82f6" 
              name="Fluency"
              strokeWidth={2}
              dot={{ strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="scores.subjectKnowledge" 
              stroke="#8b5cf6" 
              name="Subject Knowledge"
              strokeWidth={2}
              dot={{ strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="scores.professionalBehavior" 
              stroke="#10b981" 
              name="Professional Behavior"
              strokeWidth={2}
              dot={{ strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Summary Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <h3 className="text-lg font-semibold text-gray-800">Total Attempts</h3>
            <p className="text-2xl font-bold text-blue-600">{rankings.length}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <h3 className="text-lg font-semibold text-gray-800">Average Score</h3>
            <p className="text-2xl font-bold text-purple-600">
              {(rankings.reduce((acc, ranking) => acc + (Object.values(ranking.scores).reduce((a, b) => a + b, 0) / 3), 0) / rankings.length).toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <h3 className="text-lg font-semibold text-gray-800">Success Rate</h3>
            <p className="text-2xl font-bold text-green-600">
              {((rankings.filter(ranking => {
                const averageScore = Object.values(ranking.scores).reduce((a, b) => a + b, 0) / 3;
                return averageScore >= threshold;
              }).length / rankings.length) * 100).toFixed(2)}%
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <h3 className="text-lg font-semibold text-gray-800">Top Performer</h3>
            <p className="text-2xl font-bold text-indigo-600">
              {rankings.length > 0 ? rankings.reduce((top, current) => {
                const topAvg = Object.values(top.scores).reduce((a, b) => a + b, 0) / 3;
                const currentAvg = Object.values(current.scores).reduce((a, b) => a + b, 0) / 3;
                return currentAvg > topAvg ? current : top;
              }).candidateName : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="rankings">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="space-y-6"
            >
              {sortedRankings.map((ranking, index) => (
                <Draggable
                  key={ranking.candidateName + ranking.date}
                  draggableId={ranking.candidateName + ranking.date}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`
                        bg-white rounded-2xl shadow-sm border p-6 
                        transition-all cursor-move
                        ${index < topN ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100'}
                        ${index === topN - 1 ? 'border-b-4 border-b-gray-300 mb-8' : ''}
                        hover:shadow-md
                      `}
                      onClick={() => fetchConversation(ranking)}
                    >
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                          <h2 className="text-xl font-semibold text-gray-800">{ranking.candidateName}</h2>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            {new Date(ranking.date).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <h3 className="font-semibold flex items-center gap-2 text-gray-800">
                            <Star className="w-5 h-5 text-yellow-500" />
                            Performance Scores
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { icon: Star, color: 'text-blue-500', label: 'Fluency', value: ranking.scores.fluency },
                              { icon: Brain, color: 'text-purple-500', label: 'Subject Knowledge', value: ranking.scores.subjectKnowledge },
                              { icon: UserCheck, color: 'text-green-500', label: 'Professional Behavior', value: ranking.scores.professionalBehavior },
                              { icon: TrendingUp, color: 'text-indigo-500', label: 'Average', value: (Object.values(ranking.scores).reduce((a, b) => a + b, 0) / 3).toFixed(2) }
                            ].map((item, i) => (
                              <div key={i} className="col-span-2 md:col-span-1">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                  <div className="flex items-center gap-2">
                                    <item.icon className={`w-4 h-4 ${item.color}`} />
                                    <span className="text-gray-600">{item.label}</span>
                                  </div>
                                  <span className="font-semibold text-gray-800">{item.value}/10</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800">Feedback</h3>
                            {index < topN && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentReviewCandidate(ranking.candidateName + ranking.date);
                                  setShowReviewModal(true);
                                }}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                              >
                                {reviews[ranking.candidateName + ranking.date] ? 'Edit Review' : 'Add Review'}
                              </button>
                            )}
                          </div>
                          <p className="text-gray-600 leading-relaxed">{ranking.feedback}</p>
                          {reviews[ranking.candidateName + ranking.date] && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                              <h4 className="font-medium text-blue-800 mb-2">Panel Review</h4>
                              <p className="text-blue-600">{reviews[ranking.candidateName + ranking.date].text}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {showModal && (
        <ConversationModal
          conversation={selectedConversation}
          onClose={() => {
            setShowModal(false);
            setSelectedConversation(null);
          }}
        />
      )}
      {showReviewModal && (
        <ReviewModal
          candidateId={currentReviewCandidate}
          onClose={() => {
            setShowReviewModal(false);
            setCurrentReviewCandidate(null);
          }}
          onSubmit={async (candidateId, text) => {
            try {
              const ranking = sortedRankings.find(
                r => r.candidateName + r.date === candidateId
              );
      
              if (!ranking) throw new Error('Ranking not found');
      
              const review = {
                text,
                timestamp: new Date().toISOString()
              };
      
              const response = await fetch(`http://localhost:5000/update-panel-review`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  candidateName: ranking.candidateName,
                  date: ranking.date,
                  review,
                  postId: Post_ID // Add postId to the request
                })
              });
      
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save review');
              }
      
              // Update local state
              setReviews(prev => ({
                ...prev,
                [candidateId]: review
              }));
      
              toast.success('Review saved successfully');
            } catch (error) {
              console.error('Error saving review:', error);
              toast.error(error.message || 'Failed to save review');
            }
          }}
        />
      )}
      <ToastContainer position="top-left" autoClose={3000} />
    </div>
  );
};