using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;

namespace StremioMihonLauncher
{
    static class Program
    {
        static bool IsPortOpen(string host, int port, int timeoutMs = 250)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(timeoutMs);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        [STAThread]
        static void Main(string[] args)
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string stremioDir = Path.Combine(localAppData, "Programs", "Stremio");
            string stremioShell = Path.Combine(stremioDir, "stremio-shell-ng.exe");
            string stremioRuntime = Path.Combine(stremioDir, "stremio-runtime.exe");
            string stremioServerJs = Path.Combine(stremioDir, "server.js");

            string currentDir = AppDomain.CurrentDomain.BaseDirectory;

            // Search for http_server.js in common locations (current, parent, stremio-web subfolder)
            string[] possibleServerPaths = new string[]
            {
                Path.Combine(currentDir, "http_server.js"),
                Path.Combine(currentDir, "..", "http_server.js"),
                Path.Combine(currentDir, "stremio-web", "http_server.js")
            };

            string httpServerScript = null;
            foreach (var path in possibleServerPaths)
            {
                if (File.Exists(path))
                {
                    httpServerScript = Path.GetFullPath(path);
                    break;
                }
            }

            if (!File.Exists(stremioShell))
            {
                return;
            }

            // 1. Ensure Stremio local streaming server is running on 11470 with CORS enabled
            if (!IsPortOpen("127.0.0.1", 11470, 200))
            {
                ProcessStartInfo runtimePsi = new ProcessStartInfo
                {
                    FileName = stremioRuntime,
                    Arguments = "\"" + stremioServerJs + "\"",
                    WorkingDirectory = stremioDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                runtimePsi.EnvironmentVariables["NO_CORS"] = "1";
                try
                {
                    Process.Start(runtimePsi);
                }
                catch { }
            }

            // 2. Ensure custom WebUI server is running on port 8080 if server script exists
            if (!IsPortOpen("127.0.0.1", 8080, 200) && httpServerScript != null)
            {
                string nodeExe = "node.exe";
                string programFilesNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
                if (File.Exists(programFilesNode))
                {
                    nodeExe = programFilesNode;
                }

                ProcessStartInfo webPsi = new ProcessStartInfo
                {
                    FileName = nodeExe,
                    Arguments = "\"" + httpServerScript + "\"",
                    WorkingDirectory = Path.GetDirectoryName(httpServerScript),
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                try
                {
                    Process.Start(webPsi);
                }
                catch { }
            }

            // 3. Close old shell instances if any are hanging
            try
            {
                foreach (var proc in Process.GetProcessesByName("stremio-shell-ng"))
                {
                    proc.Kill();
                }
            }
            catch { }

            // 4. Launch native Stremio desktop shell
            string webUiUrl = "http://localhost:8080/?streamingServerUrl=http%3A%2F%2F127.0.0.1%3A11470%2F";
            ProcessStartInfo shellPsi = new ProcessStartInfo
            {
                FileName = stremioShell,
                Arguments = "--webui-url \"" + webUiUrl + "\"",
                WorkingDirectory = stremioDir,
                UseShellExecute = true
            };

            try
            {
                Process.Start(shellPsi);
            }
            catch { }
        }
    }
}
