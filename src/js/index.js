import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.scss';

// react v17
// ReactDOM.render(<App />, document.getElementById('root'));

// react v18
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
