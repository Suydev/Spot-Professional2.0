import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AudioQuality, VideoQuality } from "@workspace/api-client-react/src/generated/api.schemas";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings();
  
  const [formData, setFormData] = useState({
    audioQuality: "mp3-320" as AudioQuality,
    videoQuality: "1080p" as VideoQuality,
    chunkSize: 10,
    maxSongs: 100,
    embedMetadata: true
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        audioQuality: settings.audioQuality,
        videoQuality: settings.videoQuality,
        chunkSize: settings.chunkSize,
        maxSongs: settings.maxSongs,
        embedMetadata: settings.embedMetadata
      });
    }
  }, [settings]);

  const updateMutation = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved", description: "Your preferences have been updated." });
      },
      onError: (err) => {
        toast({ 
          title: "Failed to save settings", 
          description: "An error occurred.", 
          variant: "destructive" 
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      data: {
        ...formData,
        chunkSize: Number(formData.chunkSize),
        maxSongs: Number(formData.maxSongs)
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8 pt-12">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Preferences</h1>
        <p className="text-muted-foreground mt-2 text-lg">Configure SpotD's engine and output quality.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8 bg-card border border-border p-8 rounded-xl shadow-sm">
        
        <div className="grid gap-8 md:grid-cols-2">
          {/* Quality Settings */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Media Quality</h3>
              <p className="text-sm text-muted-foreground">Default quality settings for new downloads.</p>
            </div>
            
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Audio Quality</Label>
              <Select 
                value={formData.audioQuality} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, audioQuality: v as AudioQuality }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp3-128">MP3 128kbps (Compact)</SelectItem>
                  <SelectItem value="mp3-192">MP3 192kbps (Standard)</SelectItem>
                  <SelectItem value="mp3-320">MP3 320kbps (High)</SelectItem>
                  <SelectItem value="flac">FLAC (Lossless)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">YouTube Video Quality</Label>
              <Select 
                value={formData.videoQuality} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, videoQuality: v as VideoQuality }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="360p">360p (Fastest)</SelectItem>
                  <SelectItem value="480p">480p (SD)</SelectItem>
                  <SelectItem value="720p">720p (HD)</SelectItem>
                  <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  <SelectItem value="1440p">1440p (2K)</SelectItem>
                  <SelectItem value="2160p">2160p (4K Ultra HD)</SelectItem>
                  <SelectItem value="4320p">4320p (8K Ultra HD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Engine Settings */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Engine Config</h3>
              <p className="text-sm text-muted-foreground">Advanced concurrency and metadata settings.</p>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max Concurrent Downloads (Chunk Size)</Label>
              <Input 
                type="number" 
                min={1} 
                max={50} 
                className="bg-background"
                value={formData.chunkSize}
                onChange={(e) => setFormData(prev => ({ ...prev, chunkSize: parseInt(e.target.value) || 1 }))}
              />
              <p className="text-xs text-muted-foreground">Higher values download faster but use more memory.</p>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Playlist Limit (Max Songs)</Label>
              <Input 
                type="number" 
                min={1} 
                max={200} 
                className="bg-background"
                value={formData.maxSongs}
                onChange={(e) => setFormData(prev => ({ ...prev, maxSongs: parseInt(e.target.value) || 1 }))}
              />
              <p className="text-xs text-muted-foreground">Maximum tracks to fetch per playlist link.</p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">Embed Metadata</Label>
            <p className="text-sm text-muted-foreground">Add ID3 tags and cover art to downloaded files.</p>
          </div>
          <Switch 
            checked={formData.embedMetadata}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, embedMetadata: checked }))}
          />
        </div>

        <div className="pt-8 flex justify-end">
          <Button 
            type="submit" 
            className="px-8 h-12 text-base font-semibold"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="mr-2 animate-spin" size={20} /> : <Save className="mr-2" size={20} />}
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
