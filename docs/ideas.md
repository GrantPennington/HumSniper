Slap all my crazy ideas in here :p

# HumSniper Visual Philosophy

- Focused and calm
- Minimal visual clutter
- Information density over decoration
- Sound should feel visible
- Persistent signals should visually stand out
- Low-frequency analysis should feel grounded and stable

Safer/simple version

Generate a clean sine tone at the detected frequency.

Example:

detected 53.8Hz
user clicks “Audition”
app plays a low sine wave at 53.8Hz

This helps the user understand:

“this is the pitch/frequency HumSniper is talking about.”

More advanced version

Filter the actual mic input around that frequency and let the user listen.

Example:

isolate around 53.8Hz ± 5Hz
play filtered live audio to headphones

That’s cooler, but also riskier because:

possible feedback if speakers are on
more audio routing complexity
low frequencies can be hard to hear on normal headphones/speakers
privacy/safety UI matters more

So I’d start with generated tone audition, not live filtered monitoring.

Later feature name could be:

Frequency Audition

Buttons:

Play tone
Stop tone
“Use headphones recommended”
volume slider very low by default

That would be a genuinely cool feature. It makes HumSniper more intuitive because the user can both see and hear what the app detected.

Investigation workflow ideas:

- Compare baseline vs AC on to see which persistent bands appear only with HVAC load
- Compare laptop idle vs heavy compile or fan spin-up to see whether 120Hz or 240Hz family hints get stronger
- Compare lights on/off, charger connected/disconnected, or monitor brightness states as named checkpoints
