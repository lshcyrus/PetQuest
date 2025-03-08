import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import GlobalProvider from './provider/globalContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
    <GlobalProvider>
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    </GlobalProvider>

)
