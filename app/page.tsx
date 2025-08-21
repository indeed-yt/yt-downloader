import VideoDownloader from "./components/videoDownloader/VideoDownloader";

export default function Home() {
  return (
    <div className="container">
      <VideoDownloader baseUrl="/api" />
    </div>
  );
}
