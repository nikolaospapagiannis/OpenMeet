"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Check, X, RefreshCw, ExternalLink, Users, Calendar, Bell, FileText, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button-v2";
import { CardGlass } from "@/components/ui/card-glass";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/api";

export default function TeamsSettingsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [integration, setIntegration] = useState<any>(null);
  const [settings, setSettings] = useState({
    autoJoinMeetings: true,
    recordAudio: true,
    recordVideo: false,
    enableTranscription: true,
    enableSummary: true,
    sendNotifications: true,
    botName: "OpenMeet Notetaker",
    postToChannel: true,
  });

  useEffect(() => {
    fetchIntegration();
  }, []);

  const fetchIntegration = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getIntegrationStatus("teams");
      setIntegration(data);
      if (data.settings) {
        setSettings({ ...settings, ...data.settings });
      }
    } catch (err: any) {
      console.error("Failed to fetch Teams integration:", err);
      setError("Failed to load Teams settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setError("");
    setIsLoading(true);
    try {
      const response = await apiClient.initiateIntegrationOAuth("teams");
      if (response.authUrl) {
        window.location.href = response.authUrl;
      }
    } catch (err: any) {
      console.error("Failed to connect Teams:", err);
      setError(err.response?.data?.message || "Failed to connect Teams");
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Microsoft Teams?")) {
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await apiClient.disconnectIntegration("teams");
      setIntegration(null);
      setSuccess("Microsoft Teams disconnected successfully");
    } catch (err: any) {
      console.error("Failed to disconnect Teams:", err);
      setError(err.response?.data?.message || "Failed to disconnect Teams");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      await apiClient.updateIntegrationSettings("teams", settings);
      setSuccess("Settings saved successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      setError(err.response?.data?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (field: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleInputChange = (field: keyof typeof settings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading && !integration) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
          <p className="text-slate-400">Loading Microsoft Teams settings...</p>
        </div>
      </div>
    );
  }

  const isConnected = integration && integration.status === "connected";

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <Link href="/integrations">
            <Button variant="ghost-glass" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Integrations
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-3 shadow-lg shadow-blue-500/20">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Microsoft Teams Integration</h1>
              <p className="text-slate-400 mt-1">Connect Teams to auto-record and transcribe meetings</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 backdrop-blur-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg mb-6 flex items-center backdrop-blur-sm">
            <Check className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        <CardGlass variant="elevated" className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Connection Status</h2>
            <p className="text-slate-400 mb-6">
              {isConnected ? "Your Microsoft account is connected" : "Connect Microsoft Teams to enable automatic meeting transcription"}
            </p>

            {isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Check className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Connected</p>
                      <p className="text-sm text-slate-400">Connected as {integration.metadata?.email || "Microsoft User"}</p>
                    </div>
                  </div>
                  <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading}>Disconnect</Button>
                </div>
                <div className="text-sm text-slate-400">
                  <p className="font-medium mb-1 text-slate-300">Connected since:</p>
                  <p>{new Date(integration.connectedAt).toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700/50 rounded-lg">
                      <X className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Not Connected</p>
                      <p className="text-sm text-slate-400">Connect your Microsoft account to start</p>
                    </div>
                  </div>
                  <Button variant="gradient-primary" onClick={handleConnect} disabled={isLoading}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Teams
                  </Button>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-400 mb-2">What happens when you connect?</h4>
                  <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                    <li>OpenMeet bot joins your Teams meetings automatically</li>
                    <li>Transcripts are generated in real-time</li>
                    <li>AI summaries posted to your channels</li>
                    <li>All data is encrypted and secure</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </CardGlass>

        {isConnected && (
          <CardGlass variant="elevated" className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Bot Settings</h2>
              <p className="text-slate-400 mb-6">Configure how OpenMeet works with Teams</p>
              <div className="space-y-4">
                <SettingRow icon={Calendar} color="purple" label="Auto-join meetings" desc="Join scheduled Teams meetings" checked={settings.autoJoinMeetings} onToggle={() => handleToggle("autoJoinMeetings")} />
                <SettingRow icon={FileText} color="amber" label="Enable transcription" desc="Generate text transcripts" checked={settings.enableTranscription} onToggle={() => handleToggle("enableTranscription")} />
                <SettingRow icon={Sparkles} color="violet" label="AI summaries" desc="Generate meeting summaries" checked={settings.enableSummary} onToggle={() => handleToggle("enableSummary")} />
                <SettingRow icon={MessageSquare} color="blue" label="Post to channel" desc="Share summaries in Teams channels" checked={settings.postToChannel} onToggle={() => handleToggle("postToChannel")} />
                <SettingRow icon={Bell} color="emerald" label="Notifications" desc="Get notified when transcripts ready" checked={settings.sendNotifications} onToggle={() => handleToggle("sendNotifications")} />

                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <Label htmlFor="botName" className="text-white font-medium">Bot display name</Label>
                  <Input id="botName" value={settings.botName} onChange={(e) => handleInputChange("botName", e.target.value)} placeholder="OpenMeet Notetaker" className="mt-2 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500" />
                  <p className="text-sm text-slate-400 mt-2">Name shown when bot joins meetings</p>
                </div>

                <div className="pt-4">
                  <Button variant="gradient-primary" onClick={handleSaveSettings} disabled={isSaving} className="w-full">
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </div>
          </CardGlass>
        )}

        <div className="text-center text-sm text-slate-500">
          Need help?{" "}
          <a href="/docs/teams-integration" className="text-blue-400 hover:text-blue-300 transition-colors">
            View Teams integration guide
          </a>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, color, label, desc, checked, onToggle }: { icon: any; color: string; label: string; desc: string; checked: boolean; onToggle: () => void }) {
  const colors: Record<string, string> = {
    purple: "bg-purple-500/20 text-purple-400",
    blue: "bg-blue-500/20 text-blue-400",
    cyan: "bg-cyan-500/20 text-cyan-400",
    amber: "bg-amber-500/20 text-amber-400",
    violet: "bg-violet-500/20 text-violet-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
  };
  const [bg, text] = (colors[color] || colors.blue).split(" ");
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${text}`} />
        </div>
        <div>
          <Label className="text-white font-medium">{label}</Label>
          <p className="text-sm text-slate-400">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );
}
