# Nexo help

🇪🇸 [Ayuda en español](AYUDA.md) · [Back to the README](README.en.md)

## Install

1. Download `Nexo_…_x64-setup.exe` from the [latest release](https://github.com/SebastianSKS/nexushub/releases/latest).
2. Open it. If Windows shows **“Windows protected your PC”**, click **More info** and then **Run anyway**. It appears because Nexo is a new, small program that doesn't have the paid certificate Windows recognizes yet; the installer is the same one published here.
3. When it finishes, Nexo opens. The first time, it shows you how each section works (you can repeat it with the **How does it work?** button on each one).

It installs for your user only: no administrator permissions needed.

## Install on Linux

From the same release, grab the `.deb` (Ubuntu, Debian, Mint, Pop!_OS…) or the AppImage, which
needs no installing:

```bash
sudo apt install ./Nexo_…_amd64.deb     # or: chmod +x Nexo_…_x86_64.AppImage and run it
```

**What is different on Linux**

- **Music doesn't play inside Nexo.** Spotify only gives its content protection (DRM) to Chromium
  browsers, and the window on Linux is WebKit, not Chromium. You can still open anything in the
  Spotify app or browser as usual.
- **Document conversion uses LibreOffice** if you have it installed (Writer for Word, Calc for
  Excel, Impress for PowerPoint), with the same fidelity as saving as PDF from there. If you don't
  have it, Nexo's own basic engine is used, as on Windows without Office. LibreOffice can't turn a
  PDF back into a Word, so that one always uses the basic engine.
- Windows-only extras are simply not there: the list of installed programs for the quick links, and
  opening a PDF on the exact page with Edge.

## Update

Nexo checks on its own when it opens and every few hours. If there's a new version, a notice appears with **Update now**; it downloads, installs and Nexo reopens on its own. Your data is kept. You can also check in **Settings › About › Check for updates**.

## FAQ

**I don't get notifications.**
Nexo notifies you while it's open (even in the system tray; turn on *Keep playing in the tray* in Settings for that). Also check that Windows **Focus assist / Do not disturb** and Nexo's own **Do not disturb** (Settings › Notifications) are off. You can try it with *Send a test notice*.

**How do I change the notification sound?**
Settings › Notifications › *Notification sound*: five Nexo sounds, five Windows sounds, or no sound. Nexo's sounds have their own volume.

**Spotify music doesn't play.**
To play inside Nexo, Spotify requires a **Premium** account. If you just connected it and it doesn't respond, sign out of Spotify in Settings and connect again.

**Spotify says my account isn't authorized.**
Spotify limits new apps to a handful of accounts their creator authorizes by hand (a Spotify rule, not Nexo's). Ask whoever gave you Nexo to add your Spotify account's email; meanwhile Video, Documents, Calendar, Schedule and Calculator work as usual.

**Videos or music are slow to load.**
Both sections use YouTube and Spotify and need internet. If your browser or antivirus blocks their servers, Nexo can't show them.

**A Word, Excel or PowerPoint conversion isn't what I expected.**
If you have Microsoft Office installed, Nexo uses it so the result matches saving from Office (you can turn it off in Settings › Documents). Without Office it uses its own engine, which covers the usual cases; each result tells you what isn't preserved.

**Can I send my schedule to a classmate?**
Yes. In *Schedule* press **Share**: you save your schedule to a file or copy a short code to paste into a message. Your classmate opens *Share* in their Nexo, pastes the code (or chooses the file) and adds it to their schedule or replaces it. Only the schedule travels: nothing from your profile, calendar or notes.

**How do I keep track of my average?**
In *Calculator* there's an **Average** tab. Add your subjects (or bring them in from your schedule), enter how much each assessment is worth and the grade you already got. Nexo tells you how you're doing in each subject and how much you need on what's left to pass. Choose your school's scale (0 to 10 or 0 to 100) and the passing mark. Everything is kept on your computer and included in the backup.

**Where does Nexo keep my stuff?**
Everything is on your computer; nothing is uploaded:
- Settings, profile, schedule, calendar, channels and favorites: in the app data (`%LOCALAPPDATA%\com.nexushub.app`), with an automatic copy in `%APPDATA%\NexusHub`.
- Your subject folders: `Documents\Nexo\Tareas`.

**I want to move everything to another computer.**
Settings › Backup › *Save backup*. On the other computer, install Nexo and use *Restore from a backup*. The backup doesn't include your Spotify session.

**Something failed and an error screen appeared.**
Your data is safe. Press **Try again** or **Go to Home**; if it keeps happening, use **Report the problem**: it opens a GitHub report with the version and your system already filled in (never your files, calendar or name).

**Nexo is slow on my computer.**
Settings › Appearance › *Low-power mode*. On *Automatic* (the default) it turns on by itself if your computer has few cores or little memory: it removes the window transparency, lowers the animations and makes the search inside your files gentler so you don't notice it. You can set it to *Always on*. If it's still slow, tell us about your computer with *Report the problem*.

**Uninstall.**
Windows Settings › Apps › Nexo › Uninstall. Your `Documents\Nexo\Tareas` folders aren't deleted.

## Contact

Open a [report](https://github.com/SebastianSKS/nexushub/issues/new/choose) telling what happened and what you were doing. If you can, paste what **Settings › About › Copy technical information** copies.
