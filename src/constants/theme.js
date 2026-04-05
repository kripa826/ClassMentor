export const PALETTE = {
    mintTeal: "#5ED1C6",        // softer teal (Birds)
    peach: "#E6A08A",          // warm peach (Buddies)
    softYellow: "#F4D58D",     // pastel yellow (chips / highlights)
    pastelPurple: "#9B8CFF",   // primary accent (Pairs / CTAs)
    pageBg: "linear-gradient(180deg, #063149ff 0%, #7aa5dfff 100%)",
    cardBorder: "rgba(255,255,255,0.08)",
    textDark: "#EAF0FF",
    textLight: "#EAF0FF",
};

export const GLASS_GRADIENTS = {
    teal: {
        background: `
      linear-gradient(135deg, rgba(94,209,198,0.85) 0%, rgba(72,180,255,0.85) 70%),
      radial-gradient(900px 260px at 10% 10%, rgba(255,255,255,0.10), transparent 14%)
    `,
        avatar: "linear-gradient(135deg, #5ED1C6, #AEECEF)",
        chipBg: "#5ED1C6",
        text: "#062925",
        border: "1px solid rgba(255,255,255,0.12)",
    },
    magenta: {
        background: `
      linear-gradient(135deg, rgba(230,160,138,0.9) 0%, rgba(255,135,175,0.85) 70%),
      radial-gradient(900px 260px at 12% 10%, rgba(255,255,255,0.10), transparent 14%)
    `,
        avatar: "linear-gradient(135deg, #E6A08A, #FFD1C4)",
        chipBg: "#E6A08A",
        text: "#3A1610",
        border: "1px solid rgba(255,255,255,0.12)",
    },
    yellow: {
        background: `
      linear-gradient(135deg, rgba(155,140,255,0.9) 0%, rgba(120,110,255,0.85) 70%),
      radial-gradient(900px 260px at 12% 10%, rgba(255,255,255,0.10), transparent 14%)
    `,
        avatar: "linear-gradient(135deg, #9B8CFF, #C7BFFF)",
        chipBg: "#9B8CFF",
        text: "#1A1445",
        border: "1px solid rgba(255,255,255,0.12)",
    },
};
