import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isFeatureEnabled } from './config/features';
import LandingPage from './pages/LandingPage';
import SignUpSignInPage from './pages/SignUpSignInPage';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import VoiceSearchPage from './pages/VoiceSearchPage';
import SystemStatusPage from './pages/SystemStatusPage';
import IntegrationsPage from './pages/IntegrationsPage';
import IntegrationCallbackPage from './pages/IntegrationCallbackPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import NotFoundPage from './pages/NotFoundPage';
import LoadingSpinner from './components/LoadingSpinner';
import Onboarding from './components/Onboarding';

// Import CSS
import './components/SignIn.css';
import './components/AuthCallback.css';
import './components/Dashboard.css';
import './App.css';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();
	
	if (isLoading) {
		return <LoadingSpinner />;
	}
	
	return isAuthenticated ? <>{children}</> : <Navigate to="/signin" replace />;
}

// Public route wrapper (redirect if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();
	
	if (isLoading) {
		return <LoadingSpinner />;
	}
	
	return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

// App content with routing
function AppContent() {
	return (
		<Router>
			<div className="App">
				<Routes>
					{/* Landing page - NEW route */}
					<Route
						path="/"
						element={<LandingPage />}
					/>
					{/* Privacy Policy - Public route */}
					<Route
						path="/privacy"
						element={<PrivacyPolicyPage />}
					/>
					{/* Terms of Use - Public route */}
					<Route
						path="/terms"
						element={<TermsOfUsePage />}
					/>
					{/* Public routes */}
					<Route
						path="/signup-signin"
						element={
							<PublicRoute>
								<SignUpSignInPage />
							</PublicRoute>
						}
					/>
					<Route 
						path="/signup" 
						element={
							<PublicRoute>
								<SignUpPage />
							</PublicRoute>
						} 
					/>
					<Route 
						path="/signin" 
						element={
							<PublicRoute>
								<SignInPage />
							</PublicRoute>
						} 
					/>
					<Route path="/auth/callback" element={<AuthCallbackPage />} />
					
					{/* Protected routes */}
					<Route 
						path="/profile-setup" 
						element={
							<ProtectedRoute>
								<ProfileSetupPage />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/onboarding" 
						element={
							<ProtectedRoute>
								<Onboarding />
							</ProtectedRoute>
						} 
					/>
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<DashboardPage />
							</ProtectedRoute>
						}
					/>

					{/* Integrations */}
					<Route
						path="/integrations"
						element={
							<ProtectedRoute>
								<IntegrationsPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/integrations/success"
						element={
							<ProtectedRoute>
								<IntegrationCallbackPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/integrations/error"
						element={
							<ProtectedRoute>
								<IntegrationCallbackPage />
							</ProtectedRoute>
						}
					/>

					{/* Feature-gated routes: Search */}
					{isFeatureEnabled('semanticSearch') && (
						<Route
							path="/search"
							element={
								<ProtectedRoute>
									<SearchPage />
								</ProtectedRoute>
							}
						/>
					)}

					{/* Feature-gated routes: Voice Search */}
					{isFeatureEnabled('voiceSearch') && (
						<Route
							path="/voice"
							element={
								<ProtectedRoute>
									<VoiceSearchPage />
								</ProtectedRoute>
							}
						/>
					)}

					<Route
						path="/system-status"
						element={
							<ProtectedRoute>
								<SystemStatusPage />
							</ProtectedRoute>
						}
					/>
					
					{/* Fallback route */}
					<Route path="*" element={<NotFoundPage />} />
				</Routes>
			</div>
		</Router>
	);
}

function App() {
	return (
		<AuthProvider>
			<AppContent />
		</AuthProvider>
	);
}

export default App;