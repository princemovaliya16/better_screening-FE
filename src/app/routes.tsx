import { createBrowserRouter, Navigate } from 'react-router-dom';
import { InterviewRoomLayout } from './InterviewRoomLayout';
import { RecruiterShellLayout } from './RecruiterShellLayout';
import { RequireAuth } from './RequireAuth';
import { CandidateDetailsPage } from '@/features/candidates/CandidateDetailsPage';
import { CandidatesListPage } from '@/features/candidates/CandidatesListPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { InterviewRoomPage } from '@/features/interview-room/InterviewRoomPage';
import { InterviewDetailsPage } from '@/features/interviews/InterviewDetailsPage';
import { InterviewsListPage } from '@/features/interviews/InterviewsListPage';
import { JobDetailsPage } from '@/features/jobs/JobDetailsPage';
import { JobFormPage } from '@/features/jobs/JobFormPage';
import { JobsListPage } from '@/features/jobs/JobsListPage';
import { AcceptInvitePage } from '@/features/org-onboarding/AcceptInvitePage';
import { SignupPage } from '@/features/org-onboarding/SignupPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <RecruiterShellLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'jobs', element: <JobsListPage /> },
      { path: 'jobs/new', element: <JobFormPage /> },
      { path: 'jobs/:id', element: <JobDetailsPage /> },
      { path: 'jobs/:id/edit', element: <JobFormPage /> },
      { path: 'candidates', element: <CandidatesListPage /> },
      { path: 'candidates/:id', element: <CandidateDetailsPage /> },
      { path: 'interviews', element: <InterviewsListPage /> },
      { path: 'interviews/:id', element: <InterviewDetailsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '/interview-room/:token',
    element: <InterviewRoomLayout />,
    children: [{ index: true, element: <InterviewRoomPage /> }],
  },
]);
