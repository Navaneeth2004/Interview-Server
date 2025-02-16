import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from 'react'


//Importing Screens
import { Rules } from './Components/Rules'
import { Interview } from './Components/Interview'
import { InterviewMCQ } from "./Components/InterviewMCQ";
import { RankingsAnalytics } from "./Components/Analytics";
import { MCQRankings } from "./Components/AnalyticsMCQ";
import { JobPostingSystem } from "./Components/HrPost";
import { HrVerifyCandidates } from "./Components/HrVerifyCandidates";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/rules" element={<Rules />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/mcq" element={<InterviewMCQ />} />
        <Route path="/ranking" element={<RankingsAnalytics />} />
        <Route path="/mcqranking" element={<MCQRankings />} />
        <Route path="/hrpost" element={<JobPostingSystem />} />
        <Route path="/hrverify/:postId" element={<HrVerifyCandidates />} />
      </Routes>
    </Router>
  )
}

export default App