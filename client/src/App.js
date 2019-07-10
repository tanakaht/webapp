import React from 'react';
import './App.css';
import HeatMap from './heatmap'

const path = "http://127.0.0.1:5000/data" + window.location.pathname;

function App() {
  return (
    <div className="App">
      <h2>Visualization of input</h2>
        <HeatMap csvpath={path} />
    </div>
  );
}

export default App;
