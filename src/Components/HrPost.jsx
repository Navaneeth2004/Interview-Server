import React, { useState } from 'react';
import { PlusCircle, X, UserPlus, Calendar, CheckCircle } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000';

export const JobPostingSystem = () => {
  const [posts, setPosts] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [newPanel, setNewPanel] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    minExperience: '',
    category: '',
    followupCount: '',
    totalTime: '',
    coverageNeeded: '',
    examType: '',
    applicationDeadline: '',
    testStartDate: '',
    panel: []
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [panelAssignment, setPanelAssignment] = useState({
    easy: '',
    intermediate: '',
    advanced: ''
  });
  const [panelMembers, setPanelMembers] = useState([]);
  const [panelMemberNames, setPanelMemberNames] = useState({});
  const [postsWithReports, setPostsWithReports] = useState(new Set());
  const navigate = useNavigate();

  const categories = ['Java', 'C#', 'Python', 'JavaScript', 'Ruby', 'Go'];
  const examTypes = ['Interview', 'MCQ'];

  // Update the handleInputChange function
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let validatedValue = value;

    // Special handling for exam type changes
    if (name === 'examType') {
      if (value === 'MCQ') {
        // Clear followup and coverage when MCQ is selected
        setFormData(prev => ({
          ...prev,
          [name]: value,
          followupCount: '',
          coverageNeeded: ''
        }));
        return;
      }
    }

    // Handle numeric fields
    const numericFields = ['minExperience', 'followupCount', 'totalTime', 'coverageNeeded'];
    if (numericFields.includes(name)) {
      if (!/^\d*$/.test(value)) {
        return;
      }
      
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

    setFormData(prev => ({
      ...prev,
      [name]: validatedValue
    }));
  };

  // Add a new function to handle keypress
  const handleKeyPress = (e) => {
    const numericFields = ['minExperience', 'followupCount', 'totalTime', 'coverageNeeded'];
    if (numericFields.includes(e.target.name)) {
      // Allow only numbers and control keys
      if (!/[\d\b]/.test(e.key)) {
        e.preventDefault();
      }
    }
  };

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const canEditPost = (post) => {
    const deadline = new Date(post.applicationDeadline);
    const today = new Date();
    return today <= deadline;
  };

  // Add this function to reset the form
  const resetFormData = () => {
    setFormData({
      title: '',
      description: '',
      minExperience: '',
      category: '',
      followupCount: '',
      totalTime: '',
      coverageNeeded: '',
      examType: '',
      applicationDeadline: '',
      testStartDate: '',
      panel: []
    });
  };

  // Add this check function
  const isMCQSelected = () => formData.examType === 'MCQ';

  // Update the handleSubmit function
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const postData = {
        title: formData.title,
        description: formData.description,
        minimum_experience: parseInt(formData.minExperience),
        category: formData.category,
        exam_type: formData.examType,
        followup: formData.examType === 'MCQ' ? null : parseInt(formData.followupCount),
        coverage: formData.examType === 'MCQ' ? null : parseInt(formData.coverageNeeded),
        time: parseInt(formData.totalTime),
        application_deadline: formData.applicationDeadline,
        test_start_date: formData.testStartDate
      };

      const response = await fetch(`${API_BASE_URL}/save-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        throw new Error('Failed to save post');
      }

      const savedPost = await response.json();
      setPosts(prev => [...prev, { ...formData, id: savedPost.post_id, panel: [] }]);
      resetFormData();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error saving post:', error);
      setError('Failed to save post. Please try again.');
    }
  };

  // Update the canAssignPanel function
  const canAssignPanel = (post) => {
    const deadline = new Date(post.applicationDeadline);
    const testDate = new Date(post.testStartDate);
    const today = new Date();
    
    // Calculate date 3 days before test
    const threeDaysBeforeTest = new Date(testDate);
    threeDaysBeforeTest.setDate(testDate.getDate() - 3);
    
    // Can only assign panel if:
    // 1. Application deadline has passed AND
    // 2. Current date is not within 3 days of test start date AND
    // 3. Panel is not already assigned
    return today > deadline && 
           today < threeDaysBeforeTest && 
           (!post.panel || post.panel.length === 0);
  };

  // Update handleAddPanel function
  const handleAddPanel = async (e) => {
    e.preventDefault();
    try {
      // Check if all required fields are filled
      if (selectedPost.examType === 'MCQ') {
        if (!panelAssignment.easy) {
          setError('Please assign a panel member');
          return;
        }
      } else {
        if (!panelAssignment.easy || !panelAssignment.intermediate || !panelAssignment.advanced) {
          setError('Please assign all panel members');
          return;
        }
      }
  
      const panelData = {
        post_id: selectedPost.id,
        exam_type: selectedPost.examType,  // Add exam_type to the request
        panels: selectedPost.examType === 'MCQ' 
          ? [panelAssignment.easy] 
          : [panelAssignment.easy, panelAssignment.intermediate, panelAssignment.advanced]
      };
  
      const response = await fetch(`${API_BASE_URL}/update-panel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(panelData)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update panel');
      }
  
      // Update local state
      const updatedPosts = posts.map(post => {
        if (post.id === selectedPost.id) {
          return {
            ...post,
            panel: selectedPost.examType === 'MCQ' 
              ? [panelAssignment.easy] 
              : [panelAssignment.easy, panelAssignment.intermediate, panelAssignment.advanced]
          };
        }
        return post;
      });
      
      setPosts(updatedPosts);
      setSelectedPost(updatedPosts.find(p => p.id === selectedPost.id));
      setPanelAssignment({ easy: '', intermediate: '', advanced: '' });
      setError(null); // Clear any existing errors
      
    } catch (error) {
      console.error('Error updating panel:', error);
      setError(error.message || 'Failed to update panel members');
    }
  };

  const handleDelete = (postId) => {
    setPostToDelete(postId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/delete-post/${postToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      // Update local state after successful deletion
      setPosts(posts.filter(post => post.id !== postToDelete));
      setShowDeleteConfirm(false);
      setIsDetailsModalOpen(false);
      setPostToDelete(null);
      
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post. Please try again.');
    }
  };

  const handleEdit = () => {
    setEditFormData(selectedPost);
    setIsEditMode(true);
    setIsDetailsModalOpen(false);
    setIsCreateModalOpen(true);
  };

  // Update the handleEditSubmit function
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const postData = {
        title: formData.title,
        description: formData.description,
        minimum_experience: parseInt(formData.minExperience),
        category: formData.category,
        exam_type: formData.examType,
        followup: parseInt(formData.followupCount),
        coverage: parseInt(formData.coverageNeeded),
        time: parseInt(formData.totalTime),
        application_deadline: formData.applicationDeadline,
        test_start_date: formData.testStartDate
      };

      const response = await fetch(`${API_BASE_URL}/update-post/${editFormData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        throw new Error('Failed to update post');
      }

      // Update local state
      setPosts(posts.map(post => 
        post.id === editFormData.id ? { ...formData, id: post.id, panel: post.panel } : post
      ));
      resetFormData();
      setIsCreateModalOpen(false);
      setIsEditMode(false);
      setEditFormData(null);

    } catch (error) {
      console.error('Error updating post:', error);
      setError('Failed to update post. Please try again.');
    }
  };

  React.useEffect(() => {
    if (isEditMode && editFormData) {
      setFormData(editFormData);
    }
  }, [isEditMode, editFormData]);

  // Update the useEffect hook that fetches posts
  React.useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/posts`);
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        const data = await response.json();
        setPosts(data.map(post => {
          // Format the dates to YYYY-MM-DD format
          const applicationDeadline = post.application_deadline ? 
            new Date(post.application_deadline).toISOString().split('T')[0] : '';
          const testStartDate = post.test_start_date ? 
            new Date(post.test_start_date).toISOString().split('T')[0] : '';

          return {
            ...post,
            id: post.post_id,
            minExperience: post.minimum_experience,
            examType: post.exam_type,
            followupCount: post.followup,
            coverageNeeded: post.coverage,
            totalTime: post.time,
            applicationDeadline: applicationDeadline,
            testStartDate: testStartDate,
            panel: post.panel_id ? post.panel_id.split(',').filter(Boolean) : []
          };
        }));
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    };

    fetchPosts();
  }, []);

  React.useEffect(() => {
    const fetchPanelMembers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/panel-members`);
        if (!response.ok) {
          throw new Error('Failed to fetch panel members');
        }
        const data = await response.json();
        setPanelMembers(data);
      } catch (error) {
        console.error('Error fetching panel members:', error);
        setError('Failed to fetch panel members');
      }
    };

    if (isDetailsModalOpen && canAssignPanel(selectedPost)) {
      fetchPanelMembers();
    }
  }, [isDetailsModalOpen, selectedPost]);

  React.useEffect(() => {
    const fetchPanelMemberNames = async (ids) => {
      try {
        const uniqueIds = [...new Set(ids)];
        const names = {};
        for (const id of uniqueIds) {
          const member = panelMembers.find(m => m.userid.toString() === id);
          if (member) {
            names[id] = member.username;
          }
        }
        setPanelMemberNames(names);
      } catch (error) {
        console.error('Error fetching panel member names:', error);
      }
    };

    if (selectedPost?.panel?.length > 0) {
      fetchPanelMemberNames(selectedPost.panel);
    }
  }, [selectedPost?.panel, panelMembers]);

  // Update the useEffect for fetching report status
  React.useEffect(() => {
    const fetchReportableStatus = async () => {
      try {
        const newReportableStatuses = new Set();
        
        for (const post of posts) {
          const response = await fetch(`${API_BASE_URL}/check-report-status/${post.id}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          
          // Check if candidates are either reportable or already reported
          if (data.hasReportable || data.hasReported) {
            newReportableStatuses.add(post.id);
          }
        }
        
        setPostsWithReports(newReportableStatuses);
      } catch (error) {
        console.error('Error fetching report status:', error);
      }
    };

    if (posts.length > 0) {
      fetchReportableStatus();
    }
  }, [posts]);

  const ErrorMessage = ({ message }) => (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
      {message}
    </div>
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 rounded-xl p-8 w-full max-w-3xl m-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditMode ? 'Edit Job Post' : 'Create New Job Post'}
              </h2>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditMode(false);
                  setEditFormData(null);
                  resetFormData(); // Add this line
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={isEditMode ? handleEditSubmit : handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Type</label>
                  <select
                    name="examType"
                    value={formData.examType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Type</option>
                    {examTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum Experience (years)</label>
                  <input
                    type="number"
                    name="minExperience"
                    value={formData.minExperience}
                    onChange={handleInputChange}
                    min="0"
                    max="50"
                    onWheel={(e) => e.target.blur()}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Followup Questions Count</label>
                  <input
                    type="number"
                    name="followupCount"
                    value={formData.followupCount}
                    onChange={handleInputChange}
                    min="0"
                    max="10"
                    onWheel={(e) => e.target.blur()}
                    onKeyPress={handleKeyPress}
                    disabled={isMCQSelected()}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isMCQSelected() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Total Time (minutes)</label>
                  <input
                    type="number"
                    name="totalTime"
                    value={formData.totalTime}
                    onChange={handleInputChange}
                    min="1"
                    max="300"
                    onWheel={(e) => e.target.blur()}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Coverage Needed (%)</label>
                  <input
                    type="number"
                    name="coverageNeeded"
                    value={formData.coverageNeeded}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    onWheel={(e) => e.target.blur()}
                    onKeyPress={handleKeyPress}
                    disabled={isMCQSelected()}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isMCQSelected() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Application Deadline</label>
                  <input
                    type="date"
                    name="applicationDeadline"
                    value={formData.applicationDeadline}
                    onChange={handleInputChange}
                    min={getTodayString()}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Test Start Date</label>
                  <input
                    type="date"
                    name="testStartDate"
                    value={formData.testStartDate}
                    onChange={handleInputChange}
                    min={getTodayString()}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditMode(false);
                    setEditFormData(null);
                    resetFormData(); // Add this line
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isEditMode ? 'Save Changes' : 'Create Post'}
                </button>
              </div>
            </form>
          </div> 
        </div>
      )}

      {/* Posts Grid */}
      <div className="w-full max-w-5xl mx-auto space-y-4">
        {isLoading && <div className="text-center">Loading...</div>}
        {error && <ErrorMessage message={error} />}
        {posts.map(post => (
  <div 
    key={post.id} 
    className="group relative bg-white rounded-xl p-6 border border-gray-200 transition-all duration-300 hover:border-blue-300 hover:shadow-lg w-full"
  >
    <div
      onClick={() => {
        setSelectedPost(post);
        setIsDetailsModalOpen(true);
      }}
      className="cursor-pointer"
    >
      <div className="transition-transform duration-300 group-hover:-translate-y-1">
        <div className="flex justify-between items-start">
          <div className="space-y-3 flex-1">
            <h3 className="text-xl font-semibold text-gray-800">{post.title}</h3>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {post.category}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {post.examType}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <UserPlus className="w-4 h-4 mr-1 text-gray-400" />
                <span>{post.panel.length} Panel Members</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                <span>Deadline: {new Date(post.applicationDeadline).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {postsWithReports.has(post.id) && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/hrverify/${post.id}`);
        }}
        className="absolute bottom-4 right-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Verify Candidates
      </button>
    )}
  </div>
))}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          resetFormData(); // Add this line
          setIsCreateModalOpen(true);
        }}
        className="fixed bottom-8 right-8 flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        <PlusCircle className="w-8 h-8" />
      </button>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedPost && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 rounded-xl p-8 w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{selectedPost.title}</h2>
              <div className="flex items-center gap-4">
                {canEditPost(selectedPost) && (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedPost.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setIsDetailsModalOpen(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Job Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 font-medium">Category</p>
                    <p className="text-gray-800">{selectedPost.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Exam Type</p>
                    <p className="text-gray-800">{selectedPost.examType}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Min Experience</p>
                    <p className="text-gray-800">{selectedPost.minExperience} years</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Total Time</p>
                    <p className="text-gray-800">{selectedPost.totalTime} minutes</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Coverage Needed</p>
                    <p className="text-gray-800">{selectedPost.coverageNeeded}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Followup Questions</p>
                    <p className="text-gray-800">{selectedPost.followupCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.description}</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Important Dates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 font-medium">Application Deadline</p>
                    <p className="text-gray-800">
                      {selectedPost.applicationDeadline ? 
                        new Date(selectedPost.applicationDeadline).toLocaleDateString() : 
                        'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Test Start Date</p>
                    <p className="text-gray-800">
                      {selectedPost.testStartDate ? 
                        new Date(selectedPost.testStartDate).toLocaleDateString() : 
                        'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel Assignment Section */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Panel Assignment</h3>
                
                {/* Update the panel assignment form section */}
                {canAssignPanel(selectedPost) ? (
                  <form onSubmit={handleAddPanel} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {selectedPost.examType === 'MCQ' ? 'Panel Member' : 'Easy Level Panel'}
                        </label>
                        <select
                          value={panelAssignment.easy}
                          onChange={(e) => setPanelAssignment(prev => ({ ...prev, easy: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Panel Member</option>
                          {panelMembers.map(member => (
                            <option key={member.userid} value={member.userid}>
                              {member.username}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedPost.examType !== 'MCQ' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Intermediate Level Panel</label>
                            <select
                              value={panelAssignment.intermediate}
                              onChange={(e) => setPanelAssignment(prev => ({ ...prev, intermediate: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Panel Member</option>
                              {panelMembers.map(member => (
                                <option key={member.userid} value={member.userid}>
                                  {member.username}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Advanced Level Panel</label>
                            <select
                              value={panelAssignment.advanced}
                              onChange={(e) => setPanelAssignment(prev => ({ ...prev, advanced: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Panel Member</option>
                              {panelMembers.map(member => (
                                <option key={member.userid} value={member.userid}>
                                  {member.username}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
                    >
                      Assign Panels
                    </button>
                  </form>
                ) : null}
                
                {/* Update the display of assigned panels */}
                {selectedPost.panel.length > 0 && (
                  <div className={`${canAssignPanel(selectedPost) ? 'mt-6' : ''}`}>
                    <h4 className="font-medium text-gray-700 mb-3">Assigned Panels</h4>
                    <div className="space-y-2">
                      {selectedPost.panel.map((memberId, index) => (
                        <div key={`${memberId}-${index}`} className="bg-white p-3 rounded-lg">
                          <span className="text-gray-700">
                            {selectedPost.examType === 'MCQ' 
                              ? 'Panel Member: '
                              : index === 0 ? 'Easy: ' : index === 1 ? 'Intermediate: ' : 'Advanced: '}
                            {panelMemberNames[memberId] || memberId}
                          </span>
                        </div>
                      ))}
                    </div>
                    {!canAssignPanel(selectedPost) && new Date() < new Date(selectedPost.testStartDate - 3 * 24 * 60 * 60 * 1000) && (
                      <p className="text-sm text-gray-500 mt-4">
                        Panel assignments cannot be modified once set.
                      </p>
                    )}
                    {new Date() >= new Date(selectedPost.testStartDate) && (
                      <p className="text-sm text-red-500 mt-4">
                        Panel assignment period has ended as the test date has arrived.
                      </p>
                    )}
                    {new Date() >= new Date(selectedPost.testStartDate - 3 * 24 * 60 * 60 * 1000) && 
                     new Date() < new Date(selectedPost.testStartDate) && (
                      <p className="text-sm text-red-500 mt-4">
                        Panel assignment is locked 3 days before test start date.
                      </p>
                    )}
                  </div>
                )}
                
                {!selectedPost.panel.length && !canAssignPanel(selectedPost) && (
                  <p className="text-sm text-gray-500">
                    No panels have been assigned to this post.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md m-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-semibold text-gray-800">Confirm Deletion</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this job post? This action cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPostToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};