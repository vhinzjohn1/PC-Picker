# PC-Picker

A modern web application for building and managing PC configurations with cross-device synchronization.

## Features

### 🖥️ PC Parts Builder
- Add, edit, and manage PC components (CPU, GPU, Motherboard, RAM, etc.)
- Real-time cost calculation with multiple currency support
- Drag-and-drop reordering of components
- Responsive design with mobile-friendly interface

### 💾 PC Setups Management
- Save complete PC configurations as named setups
- Compare different builds side-by-side
- Load saved setups back into the parts builder
- Expandable details view for each setup
- Delete and manage multiple setups

### 🔐 User Authentication
- Secure login/register system powered by Supabase
- Cross-device data synchronization
- User-specific data isolation with Row Level Security

### 💰 Multi-Currency Support
- Support for USD, EUR, JPY, PHP
- Automatic currency formatting
- User preference persistence

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: CSS3 with modern design patterns
- **State Management**: Vue Composition API
- **Routing**: Vue Router 4

## Project Setup

### Prerequisites
- Node.js 20.19.0 or higher
- A Supabase account

### Installation

1. Clone the repository
```sh
git clone <repository-url>
cd PC-Picker
```

2. Install dependencies
```sh
npm install
```

3. Set up Supabase (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions)
   - Create a new Supabase project
   - Update `src/lib/supabase.ts` with your project credentials
   - Run the SQL script from `DATABASE_SETUP.sql` in your Supabase SQL Editor

4. Start the development server
```sh
npm run dev
```

## Database Schema

The application uses the following main tables:

- **user_profiles**: User information and currency preferences
- **parts**: Individual PC components for the current build
- **pc_setups**: Saved PC configurations
- **setup_parts**: Parts belonging to each saved setup

## Usage

### Building a PC
1. Navigate to the Parts Builder
2. Select a component type from the dropdown
3. Enter the part name and price
4. Add more components as needed
5. View the total cost in real-time

### Saving Setups
1. Build your PC configuration in the Parts Builder
2. Go to the Setups page
3. Enter a name and optional description
4. Click "Save Setup"

### Managing Setups
- View all saved setups in a grid layout
- Click "Show Parts" to see detailed component breakdown
- Use "Load" to restore a setup to the Parts Builder
- Delete setups you no longer need

## Development

### Available Scripts

```sh
# Development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
```

### Project Structure

```
src/
├── components/          # Reusable Vue components
│   ├── icons/          # SVG icon components
│   └── SpecsTable.vue  # Main parts table component
├── lib/                # Database and API utilities
│   ├── database.ts     # Database service layer
│   └── supabase.ts     # Supabase client and types
├── router/             # Vue Router configuration
├── store/              # State management
├── views/              # Page components
│   ├── PartsView.vue   # Parts builder page
│   ├── SetupsView.vue  # Setups management page
│   ├── LoginView.vue   # Authentication pages
│   └── RegisterView.vue
└── main.ts             # Application entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
