import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Loader2, CheckCircle, User } from 'lucide-react';
import { initiateOAuth } from '../services/oauth';
import { verifyUsername, type VerifyUsernameResult } from '../services/socialMediaAPI';

interface SocialMediaLoginProps {
  platform: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  onBack: () => void;
  onLogin: (credentials: { username: string; password: string }) => Promise<void>;
}

type FlowStep = 'search' | 'verify' | 'connect';

export function SocialMediaLogin({ platform, onBack, onLogin }: SocialMediaLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>('search');
  const [userVerified, setUserVerified] = useState(false);
  const [verificationData, setVerificationData] = useState<VerifyUsernameResult | null>(null);

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      fetch('https://zhengbin.app.n8n.cloud/webhook-test/x-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: platform.id,
          username: username,
          action: 'search_user',
          timestamp: new Date().toISOString(),
        }),
      }).catch(err => console.log('Webhook notification:', err));

      const result = await verifyUsername(platform.id, username);

      if (!result.exists) {
        setError(result.error || 'User not found on ' + platform.name);
        return;
      }

      setVerificationData(result);
      setFlowStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to find user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyUser = async () => {
    setError(null);
    setIsLoading(true);

    try {
      fetch('https://zhengbin.app.n8n.cloud/webhook-test/x-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: platform.id,
          username: verificationData?.username || username,
          displayName: verificationData?.displayName,
          profileUrl: verificationData?.profileUrl,
          action: 'verify_user',
          timestamp: new Date().toISOString(),
        }),
      }).catch(err => console.log('Webhook notification:', err));

      setUserVerified(true);
      setFlowStep('connect');
    } catch (err: any) {
      setError(err.message || 'Failed to verify user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await onLogin({ username, password });
    } catch (err: any) {
      setError(err.message || 'Failed to connect account. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthConnect = async () => {
    setError(null);
    setIsLoading(true);
    try {
      sessionStorage.setItem(`oauth_username_${platform.id}`, username);
      await initiateOAuth(platform.id);
    } catch (err: any) {
      console.error('OAuth error:', err);
      setError(err.message || 'Failed to initiate OAuth. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`${platform.color} p-3 rounded-lg text-2xl`}>
              {platform.icon}
            </div>
          </div>
          <CardTitle>Connect to {platform.name}</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            {flowStep === 'search' && `Search for your ${platform.name} account`}
            {flowStep === 'verify' && 'Verify your account'}
            {flowStep === 'connect' && 'Connect your account'}
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                flowStep === 'search' ? 'bg-blue-600 text-white' :
                flowStep === 'verify' || flowStep === 'connect' ? 'bg-green-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {flowStep === 'verify' || flowStep === 'connect' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  '1'
                )}
              </div>
              <div className="flex-1 h-0.5 bg-gray-200">
                <div className={`h-full transition-all duration-300 ${
                  flowStep === 'verify' || flowStep === 'connect' ? 'bg-green-600 w-full' : 'bg-blue-600 w-0'
                }`}></div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                flowStep === 'verify' ? 'bg-blue-600 text-white' :
                flowStep === 'connect' ? 'bg-green-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {flowStep === 'connect' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  '2'
                )}
              </div>
              <div className="flex-1 h-0.5 bg-gray-200">
                <div className={`h-full transition-all duration-300 ${
                  flowStep === 'connect' ? 'bg-green-600 w-full' : 'bg-blue-600 w-0'
                }`}></div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                flowStep === 'connect' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-600">Search</span>
              <span className="text-xs text-gray-600">Verify</span>
              <span className="text-xs text-gray-600">Connect</span>
            </div>
          </div>

          {flowStep === 'search' && (
            <form onSubmit={handleSearchUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  {platform.id === 'twitter' ? 'Twitter Username' : 'Username or Email'}
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={platform.id === 'twitter' ? '@username' : 'email@example.com'}
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-500">
                  Enter your {platform.name} username to search
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Search User
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {flowStep === 'verify' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {verificationData?.displayName || username}
                    </p>
                    <p className="text-sm text-gray-600">
                      @{verificationData?.username || username}
                    </p>
                    {verificationData?.profileUrl && (
                      <a
                        href={verificationData.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View Profile
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center">
                Is this your account? Click verify to continue.
              </p>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFlowStep('search');
                    setUsername('');
                  }}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Go Back
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleVerifyUser}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {flowStep === 'connect' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {verificationData?.displayName || username}
                    </p>
                    <p className="text-sm text-gray-600">
                      @{verificationData?.username || username}
                    </p>
                    <p className="text-sm text-green-600">Verified on {platform.name}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (optional for OAuth)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <p className="text-xs text-gray-500">
                  Only required if using manual login
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConnect}
                  className="flex-1"
                  disabled={isLoading || !password}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Manual Login'
                  )}
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleOAuthConnect}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect with OAuth'
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              Your credentials are sent securely and not stored on our servers.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
