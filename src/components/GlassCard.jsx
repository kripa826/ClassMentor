import React from "react";
import { Paper } from "@mui/material";
import { PALETTE } from "../constants/theme";

export default function GlassCard({ children, sx = {}, ...props }) {
    return (
        <Paper
            elevation={0}
            sx={{
                backgroundColor: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(14px) saturate(160%)",
                border: `1px solid ${PALETTE.cardBorder}`,
                borderRadius: 12,
                p: 2.5,
                boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
                color: PALETTE.textLight,
                ...sx,
            }}
            {...props}
        >
            {children}
        </Paper>
    );
}
