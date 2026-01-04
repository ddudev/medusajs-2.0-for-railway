'use client'

import { createTheme } from '@mui/material/styles'

/**
 * Material UI Theme Configuration
 * 
 * This theme is designed to work alongside Tailwind CSS.
 * Use MUI components for complex UI elements (forms, dialogs, tables)
 * and Tailwind for layout and custom styling.
 */
const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2.25rem', // 3xl
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.875rem', // 2xl
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem', // xl
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem', // lg
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  palette: {
    primary: {
      main: '#1976D2', // Main - medium-dark blue
      light: '#2196F3', // Primary - bright medium blue
      dark: '#1565C0', // Darker shade for hover/active
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#26A69A', // Main - teal/cyan
      light: '#4DB6AC',
      dark: '#00897B',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#F44336', // Sec - medium red
      light: '#EF5350',
      dark: '#C62828',
    },
    success: {
      main: '#4CAF50', // Sec - medium green
      light: '#66BB6A',
      dark: '#2E7D32',
    },
    warning: {
      main: '#FF9800', // Sec - bright orange
      light: '#FFB74D',
      dark: '#F57C00',
    },
    info: {
      main: '#2196F3', // Primary/Interactive - bright medium blue
      light: '#90CAF9', // Primary - light pastel blue
      dark: '#1976D2', // Main - medium-dark blue
    },
    text: {
      primary: '#424242', // Text - very dark gray
      secondary: '#616161', // Text - dark gray
      disabled: '#9E9E9E', // Text - medium-light gray
    },
    background: {
      default: '#FFFFFF',
      paper: '#F9FAFB',
    },
    divider: '#E5E7EB',
  },
  shape: {
    borderRadius: 4, // Match your design system
  },
  components: {
    // Button customization
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Disable uppercase transformation
          borderRadius: '4px',
          fontWeight: 500,
          padding: '8px 16px',
          '&:hover': {
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    // TextField customization
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#D1D5DB',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1976D2', // Primary main
              borderWidth: '2px',
            },
            // Completely remove Chrome autofill styling - hybrid approach
            '& input': {
              '&:-webkit-autofill': {
                WebkitAnimationName: 'autofill',
                WebkitAnimationFillMode: 'both',
                animationName: 'autofill',
                animationFillMode: 'both',
                WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
                boxShadow: '0 0 0 1000px #FFFFFF inset !important',
                WebkitTextFillColor: '#424242 !important',
                color: '#424242 !important',
                caretColor: '#424242 !important',
                transition: 'background-color 5000s ease-in-out 0s, color 5000s ease-in-out 0s !important',
                backgroundColor: '#FFFFFF !important',
              },
              '&:-webkit-autofill:hover': {
                WebkitAnimationName: 'autofill',
                WebkitAnimationFillMode: 'both',
                animationName: 'autofill',
                animationFillMode: 'both',
                WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
                boxShadow: '0 0 0 1000px #FFFFFF inset !important',
                WebkitTextFillColor: '#424242 !important',
                color: '#424242 !important',
              },
              '&:-webkit-autofill:focus': {
                WebkitAnimationName: 'autofill',
                WebkitAnimationFillMode: 'both',
                animationName: 'autofill',
                animationFillMode: 'both',
                WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
                boxShadow: '0 0 0 1000px #FFFFFF inset !important',
                WebkitTextFillColor: '#424242 !important',
                color: '#424242 !important',
              },
              '&:-webkit-autofill:active': {
                WebkitAnimationName: 'autofill',
                WebkitAnimationFillMode: 'both',
                animationName: 'autofill',
                animationFillMode: 'both',
                WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
                boxShadow: '0 0 0 1000px #FFFFFF inset !important',
                WebkitTextFillColor: '#424242 !important',
                color: '#424242 !important',
              },
            },
          },
        },
      },
    },
    // Card customization
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
    // Dialog customization
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '8px',
        },
      },
    },
    // Autocomplete customization
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
            // Completely remove Chrome autofill styling for Autocomplete
            '& input': {
              '&:-webkit-autofill': {
                WebkitAnimationName: 'autofill',
                WebkitAnimationFillMode: 'both',
                animationName: 'autofill',
                animationFillMode: 'both',
                WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
                boxShadow: '0 0 0 1000px #FFFFFF inset !important',
                WebkitTextFillColor: '#424242 !important',
                color: '#424242 !important',
                caretColor: '#424242 !important',
                transition: 'background-color 5000s ease-in-out 0s, color 5000s ease-in-out 0s !important',
                backgroundColor: '#FFFFFF !important',
              },
              '&:-webkit-autofill:hover': {
                WebkitAnimationName: 'autofill',
                WebkitAnimationFillMode: 'both',
                animationName: 'autofill',
                animationFillMode: 'both',
                WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
                boxShadow: '0 0 0 1000px #FFFFFF inset !important',
                WebkitTextFillColor: '#424242 !important',
                color: '#424242 !important',
              },
              '&:-webkit-autofill:focus': {
                WebkitAnimationName: 'autofill',
                WebkitAnimationFillMode: 'both',
                animationName: 'autofill',
                animationFillMode: 'both',
                WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
                boxShadow: '0 0 0 1000px #FFFFFF inset !important',
                WebkitTextFillColor: '#424242 !important',
                color: '#424242 !important',
              },
            },
          },
        },
      },
    },
    // InputLabel customization for autofill
    MuiInputLabel: {
      styleOverrides: {
        root: {
          zIndex: 1,
        },
      },
    },
    // OutlinedInput customization
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          // Completely remove Chrome autofill styling - hybrid approach
          '& input': {
            '&:-webkit-autofill': {
              WebkitAnimationName: 'autofill',
              WebkitAnimationFillMode: 'both',
              animationName: 'autofill',
              animationFillMode: 'both',
              WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
              boxShadow: '0 0 0 1000px #FFFFFF inset !important',
              WebkitTextFillColor: '#111827 !important',
              color: '#111827 !important',
              caretColor: '#111827 !important',
              transition: 'background-color 5000s ease-in-out 0s, color 5000s ease-in-out 0s !important',
              backgroundColor: '#FFFFFF !important',
            },
            '&:-webkit-autofill:hover': {
              WebkitAnimationName: 'autofill',
              WebkitAnimationFillMode: 'both',
              animationName: 'autofill',
              animationFillMode: 'both',
              WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
              boxShadow: '0 0 0 1000px #FFFFFF inset !important',
              WebkitTextFillColor: '#111827 !important',
              color: '#111827 !important',
            },
            '&:-webkit-autofill:focus': {
              WebkitAnimationName: 'autofill',
              WebkitAnimationFillMode: 'both',
              animationName: 'autofill',
              animationFillMode: 'both',
              WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
              boxShadow: '0 0 0 1000px #FFFFFF inset !important',
              WebkitTextFillColor: '#111827 !important',
              color: '#111827 !important',
            },
            '&:-webkit-autofill:active': {
              WebkitAnimationName: 'autofill',
              WebkitAnimationFillMode: 'both',
              animationName: 'autofill',
              animationFillMode: 'both',
              WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
              boxShadow: '0 0 0 1000px #FFFFFF inset !important',
              WebkitTextFillColor: '#111827 !important',
              color: '#111827 !important',
            },
          },
        },
      },
    },
  },
})

export default theme

