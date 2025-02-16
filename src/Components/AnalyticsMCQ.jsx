import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Book, User, Calendar, CheckCircle2, XCircle, X, ChevronRight } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
    {children}
  </div>
);

const ResultModal = ({ result, onClose }) => {
  if (!result) return null;

  const calculateStats = (mcqResponses) => {
    const correct = mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length;
    return {
      correct,
      incorrect: mcqResponses.length - correct,
      percentage: ((correct / mcqResponses.length) * 100).toFixed(1)
    };
  };

  const stats = calculateStats(result.mcqResponses);
  const pieData = [
    { name: 'Correct', value: stats.correct },
    { name: 'Incorrect', value: stats.incorrect }
  ];
  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
            <Book className="w-5 h-5 text-blue-500" />
            MCQ Results - {result.candidateName}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col justify-center space-y-4">
              <div className="text-2xl font-bold text-gray-800">
                Score: {stats.percentage}%
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span>Correct Answers: {stats.correct}</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span>Incorrect Answers: {stats.incorrect}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {result.mcqResponses.map((response, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl ${
                  response.selectedAnswer === response.correctAnswer
                    ? 'bg-green-50'
                    : 'bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {response.selectedAnswer === response.correctAnswer ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-2">
                      {index + 1}. {response.question}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <span className="text-gray-600">Selected:</span>
                        <span className={response.selectedAnswer === response.correctAnswer ? 'text-green-600' : 'text-red-600'}>
                          {response.selectedAnswer}
                        </span>
                      </p>
                      {response.selectedAnswer !== response.correctAnswer && (
                        <p className="flex items-center gap-2">
                          <span className="text-gray-600">Correct:</span>
                          <span className="text-green-600">{response.correctAnswer}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MCQRankings = () => {
  const [mcqResults, setMcqResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sortedResults, setSortedResults] = useState([]);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  const toast_during_mcq = 'mcq-warning';
  const TOP_PERFORMER_THRESHOLD = 3; // Number of top performers to highlight
  const Post_ID = 15;

  useEffect(() => {
    const fetchMCQResults = async () => {
      try {
        const response = await fetch(`http://localhost:5000/get-mcq-results/${Post_ID}`);
        if (!response.ok) throw new Error('Failed to fetch MCQ results');
        const data = await response.json();
        const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setMcqResults(sortedData);
      } catch (err) {
        if (!toast.isActive(toast_during_mcq)) {
          toast.error('Error occurred while fetching MCQ results.', { toastId: toast_during_mcq });
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMCQResults();
  }, []);

  useEffect(() => {
    if (mcqResults.length > 0) {
      const sorted = [...mcqResults].sort((a, b) => {
        const scoreA = calculateAverage(a.mcqResponses);
        const scoreB = calculateAverage(b.mcqResponses);
        return scoreB - scoreA;
      });
      setSortedResults(sorted);
    }
  }, [mcqResults]);

  // Add this to the existing useEffect or create a new one
  useEffect(() => {
    const checkReportStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5000/check-report-status/${Post_ID}`);
        if (!response.ok) throw new Error('Failed to check report status');
        const data = await response.json();
        setHasReported(data.hasReported);
      } catch (err) {
        console.error('Error checking report status:', err);
      }
    };

    checkReportStatus();
  }, [Post_ID]);

  const calculateAverage = (responses) => {
    const correct = responses.filter(r => r.selectedAnswer === r.correctAnswer).length;
    return (correct / responses.length) * 100;
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(sortedResults);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setSortedResults(items);
  };

  const prepareChartData = () => {
    return mcqResults.map(result => {
      const correctCount = result.mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length;
      const totalQuestions = result.mcqResponses.length;
      return {
        name: result.candidateName,
        date: new Date(result.date).toLocaleDateString(),
        score: ((correctCount / totalQuestions) * 100).toFixed(1),
        correct: correctCount,
        total: totalQuestions
      };
    });
  };

  const preparePerformanceGroups = () => {
    if (mcqResults.length === 0) return [];
  
    const groups = mcqResults.reduce((acc, result) => {
      const correctCount = result.mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length;
      const score = (correctCount / result.mcqResponses.length) * 100;
      
      if (score >= 90) acc[0].count++;
      else if (score >= 80) acc[1].count++;
      else if (score >= 70) acc[2].count++;
      else if (score >= 60) acc[3].count++;
      else acc[4].count++;
      
      return acc;
    }, [
      { name: 'Excellent', count: 0 },
      { name: 'Very Good', count: 0 },
      { name: 'Good', count: 0 },
      { name: 'Fair', count: 0 },
      { name: 'Poor', count: 0 }
    ]);
  
    const total = groups.reduce((sum, group) => sum + group.count, 0);
    groups.forEach(group => {
      group.percentage = ((group.count / total) * 100).toFixed(1);
    });

    return groups;
  };

  const prepareRadarData = () => {
    if (mcqResults.length === 0) return [];

    const subjectPerformance = mcqResults.reduce((acc, result) => {
      result.mcqResponses.forEach(response => {
        if (!acc[response.subject]) {
          acc[response.subject] = {
            correct: 0,
            total: 0
          };
        }
        acc[response.subject].total++;
        if (response.selectedAnswer === response.correctAnswer) {
          acc[response.subject].correct++;
        }
      });
      return acc;
    }, {});

    return Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      score: ((data.correct / data.total) * 100).toFixed(1)
    }));
  };

  const handleReportToHR = async () => {
    try {
      const topCandidates = sortedResults.slice(0, TOP_PERFORMER_THRESHOLD);
      
      if (topCandidates.length === 0) {
        toast.warning("No candidates to report");
        return;
      }
  
      const response = await fetch("http://localhost:5000/report-to-hr", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          postId: Post_ID,
          candidateIds: topCandidates.map(c => parseInt(c.candidateId, 10))
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to report to HR');
      }
  
      toast.success(`Successfully reported ${topCandidates.length} candidate${topCandidates.length > 1 ? 's' : ''} to HR`);
      setShowReportConfirm(false);
      setHasReported(true);
    } catch (error) {
      console.error('Error reporting to HR:', error);
      toast.error(error.message || "Failed to report to HR");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-gray-600">
      <div className="animate-pulse">Loading MCQ results...</div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
    </div>
  );

  const chartData = prepareChartData();
  const radarData = prepareRadarData();

  const summary = mcqResults.reduce((acc, result) => {
    const correctCount = result.mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length;
    const score = (correctCount / result.mcqResponses.length) * 100;
  
    acc.totalAttempts++;
    acc.totalQuestions += result.mcqResponses.length;
    acc.totalCorrect += correctCount;
    acc.scores.push(score);
  
    if (score > acc.highestScore) {
      acc.highestScore = score;
      acc.topPerformer = result.candidateName;
    }
  
    return acc;
  }, {
    totalAttempts: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    scores: [],
    highestScore: 0,
    topPerformer: ''
  });

  // Calculate average score
  summary.averageScore = ((summary.totalCorrect / summary.totalQuestions) * 100).toFixed(1);
  
  // Calculate success rate - candidates who scored 70% or above
  const threshold = 70;
  summary.successRate = ((mcqResults.filter(result => {
    const correctCount = result.mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length;
    const score = (correctCount / result.mcqResponses.length) * 100;
    return score >= threshold;
  }).length / mcqResults.length) * 100).toFixed(2);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-800">
          <Book className="w-8 h-8 text-blue-500" />
          MCQ Rankings
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

      {/* Add confirmation dialog */}
      {showReportConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Confirm Report to HR</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to report the top {TOP_PERFORMER_THRESHOLD} candidate{TOP_PERFORMER_THRESHOLD > 1 ? 's' : ''} to HR? 
              This action will mark their interviews for HR review.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Score Trends</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    name="Score (%)"
                    strokeWidth={2}
                    dot={{ strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Score Distribution</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={preparePerformanceGroups()}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    labelLine={false}
                    label={({ name, percentage, cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      
                      return value > 0 ? (
                        <text
                          x={x}
                          y={y}
                          fill="#374151"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          className="text-sm"
                        >
                          {`${name} (${percentage}%)`}
                        </text>
                      ) : null;
                    }}
                  >
                    {preparePerformanceGroups().map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          index === 0 ? '#22c55e' :
                          index === 1 ? '#3b82f6' :
                          index === 2 ? '#a855f7' :
                          index === 3 ? '#f59e0b' :
                          '#ef4444'
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value} attempts (${props.payload.percentage}%)`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 mt-4">
            {preparePerformanceGroups().map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: 
                        index === 0 ? '#22c55e' :
                        index === 1 ? '#3b82f6' :
                        index === 2 ? '#a855f7' :
                        index === 3 ? '#f59e0b' :
                        '#ef4444'
                    }}
                  />
                  <span className="text-sm text-gray-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Summary Statistics Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Summary Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <h3 className="text-lg font-semibold text-gray-800">Total Attempts</h3>
            <p className="text-2xl font-bold text-blue-600">{summary.totalAttempts}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <h3 className="text-lg font-semibold text-gray-800">Average Score</h3>
            <p className="text-2xl font-bold text-purple-600">
              {summary.averageScore}%
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <h3 className="text-lg font-semibold text-gray-800">Success Rate</h3>
            <p className="text-2xl font-bold text-green-600">
              {summary.successRate}%
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <h3 className="text-lg font-semibold text-gray-800">Top Performer</h3>
            <p className="text-2xl font-bold text-indigo-600">
              {summary.topPerformer}
            </p>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-6 mb-8">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="results">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-6"
              >
                {sortedResults.map((result, index) => {
                  const stats = {
                    correct: result.mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length,
                    total: result.mcqResponses.length
                  };
                  const percentage = ((stats.correct / stats.total) * 100).toFixed(1);
                  const isTopPerformer = index < TOP_PERFORMER_THRESHOLD; // Fixed top 3 performers

                  return (
                    <Draggable 
                      key={result._id || index} 
                      draggableId={result._id || `result-${index}`} 
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`
                            bg-white rounded-2xl shadow-sm p-6 
                            hover:shadow-md transition-all cursor-pointer
                            ${index < TOP_PERFORMER_THRESHOLD 
                              ? 'border-2 border-amber-300 ring-2 ring-amber-200/50' 
                              : 'border border-gray-100'
                            }
                          `}
                          onClick={() => {
                            setSelectedResult(result);
                            setShowModal(true);
                          }}
                        >
                          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 ${isTopPerformer ? 'bg-amber-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                                <User className={`w-6 h-6 ${isTopPerformer ? 'text-amber-600' : 'text-blue-600'}`} />
                              </div>
                              <div>
                                <h2 className="text-xl font-semibold text-gray-800">
                                  {result.candidateName}
                                </h2>
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(result.date).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="text-gray-600">{stats.correct}/{stats.total}</span>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                percentage >= 70 ? 'bg-green-100 text-green-800' :
                                percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {percentage}%
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {showModal && (
        <ResultModal
          result={selectedResult}
          onClose={() => {
            setShowModal(false);
            setSelectedResult(null);
          }}
        />
      )}
      <ToastContainer position="top-left" autoClose={3000} />
    </div>
  );
};
