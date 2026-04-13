[Setup]
AppName=LabSync Print Agent
AppVersion=1.0
AppPublisher=LabSync SaaS
DefaultDirName={autopf}\LabSync Print Agent
DefaultGroupName=LabSync
OutputDir=./dist_installer
OutputBaseFilename=Instalador_LabSync_Agent
Compression=lzma
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin

[Files]
Source: "dist/LabSync_PrintAgent.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{commonstartup}\LabSync Print Agent"; Filename: "{app}\LabSync_PrintAgent.exe"
Name: "{commondesktop}\LabSync Print Agent"; Filename: "{app}\LabSync_PrintAgent.exe"

[Run]
Filename: "{app}\LabSync_PrintAgent.exe"; Description: "Iniciar a Ponte de Impressão LabSync agora"; Flags: nowait postinstall skipifsilent
