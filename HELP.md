# Nexo help

🇪🇸 [Ayuda en español](AYUDA.md) · [Back to the README](README.en.md)

## Install

1. Download `Nexo_…_x64-setup.exe` from the [latest release](https://github.com/SebastianSKS/nexushub/releases/latest).
2. Open it. If Windows shows **“Windows protected your PC”**, click **More info** and then **Run anyway**. It appears because Nexo is a new, small program that doesn't have the paid certificate Windows recognizes yet; the installer is the same one published here.
3. When it finishes, Nexo opens. The first time, it shows you how each section works (you can repeat it with the **How does it work?** button on each one).

It installs for your user only: no administrator permissions needed.

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
