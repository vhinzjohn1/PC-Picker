import { supabase, type Part, type UserProfile, type PCSetup, type SetupPart } from './supabase'

// Database operations for PC parts
export class DatabaseService {
  private userId: string | null = null

  constructor() {
    // Get current user ID from Supabase auth
    this.getCurrentUserId()

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this.userId = session.user.id
      } else {
        this.userId = null
      }
    })
  }

  private async getCurrentUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    this.userId = user?.id || null
  }

  // Ensure user is authenticated
  async ensureUser(): Promise<string> {
    if (this.userId) return this.userId

    // If no user is logged in, redirect to login
    throw new Error('User not authenticated')
  }

  // Create user profile (simplified)
  private async createUserProfile(userId: string, username: string) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          username,
          currency: 'PHP',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
      }
    } catch (err) {
      console.error('Error in createUserProfile:', err)
    }
  }

  // Get all parts for current user
  async getParts(): Promise<Part[]> {
    await this.ensureUser()

    try {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching parts:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error in getParts:', err)
      return []
    }
  }

  // Add or update a part
  async savePart(component: string, name: string, amount: number): Promise<Part | null> {
    await this.ensureUser()

    try {
      // Check if part with this component already exists
      const { data: existingPart } = await supabase
        .from('parts')
        .select('*')
        .eq('user_id', this.userId)
        .eq('component', component)
        .single()

      if (existingPart) {
        // Update existing part
        const { data, error } = await supabase
          .from('parts')
          .update({
            name,
            amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPart.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating part:', error)
          return null
        }

        return data
      } else {
        // Create new part
        const { data, error } = await supabase
          .from('parts')
          .insert({
            user_id: this.userId!,
            component,
            name,
            amount,
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating part:', error)
          return null
        }

        return data
      }
    } catch (err) {
      console.error('Error in savePart:', err)
      return null
    }
  }

  // Delete a part
  async deletePart(partId: string): Promise<boolean> {
    await this.ensureUser()

    try {
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('id', partId)
        .eq('user_id', this.userId)

      if (error) {
        console.error('Error deleting part:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in deletePart:', err)
      return false
    }
  }

  // Update user currency
  async updateCurrency(currency: string): Promise<boolean> {
    await this.ensureUser()

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: this.userId,
          username: 'Anonymous User',
          currency,
        })
        .eq('id', this.userId)

      if (error) {
        console.error('Error updating currency:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in updateCurrency:', err)
      return false
    }
  }

  // Get user currency
  async getCurrency(): Promise<string> {
    await this.ensureUser()

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('currency')
        .eq('id', this.userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching currency:', error)
        return 'PHP'
      }

      // If no profile exists, create one with default currency
      if (!data) {
        await this.createUserProfile(this.userId!, 'Anonymous User')
        return 'PHP'
      }

      return data.currency || 'PHP'
    } catch (err) {
      console.error('Error in getCurrency:', err)
      return 'PHP'
    }
  }

  // Seed default parts for new users
  async seedDefaultParts(): Promise<void> {
    await this.ensureUser()

    try {
      const defaultComponents = [
        'CPU',
        'GPU',
        'Motherboard',
        'RAM',
        'Storage',
        'Power Supply',
        'Case',
        'CPU Cooler',
      ]

      for (const component of defaultComponents) {
        await this.savePart(component, '', 0)
      }
    } catch (err) {
      console.error('Error in seedDefaultParts:', err)
    }
  }

  // PC Setups methods
  async getSetups(): Promise<PCSetup[]> {
    await this.ensureUser()

    try {
      const { data, error } = await supabase
        .from('pc_setups')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching setups:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error in getSetups:', err)
      return []
    }
  }

  async createSetup(name: string, description: string, parts: Array<{ component: string; name: string; amount: number }>): Promise<PCSetup | null> {
    await this.ensureUser()

    try {
      // Ensure user profile exists
      await this.getCurrency()

      // Calculate total amount
      const totalAmount = parts.reduce((sum, part) => sum + part.amount, 0)

      // Create the setup
      const { data: setup, error: setupError } = await supabase
        .from('pc_setups')
        .insert({
          user_id: this.userId!,
          name,
          description,
          total_amount: totalAmount,
        })
        .select()
        .single()

      if (setupError) {
        console.error('Error creating setup:', setupError)
        return null
      }

      // Add parts to the setup
      const setupParts = parts.map(part => ({
        setup_id: setup.id,
        component: part.component,
        name: part.name,
        amount: part.amount,
      }))

      const { error: partsError } = await supabase
        .from('setup_parts')
        .insert(setupParts)

      if (partsError) {
        console.error('Error adding parts to setup:', partsError)
        // Clean up the setup if parts insertion failed
        await supabase.from('pc_setups').delete().eq('id', setup.id)
        return null
      }

      return setup
    } catch (err) {
      console.error('Error in createSetup:', err)
      return null
    }
  }

  async getSetupParts(setupId: string): Promise<SetupPart[]> {
    await this.ensureUser()

    try {
      const { data, error } = await supabase
        .from('setup_parts')
        .select('*')
        .eq('setup_id', setupId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching setup parts:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error in getSetupParts:', err)
      return []
    }
  }

  async loadSetupToCurrentParts(setupId: string): Promise<boolean> {
    await this.ensureUser()

    try {
      // Get setup parts
      const setupParts = await this.getSetupParts(setupId)

      if (setupParts.length === 0) {
        return false
      }

      // Clear current parts
      await supabase
        .from('parts')
        .delete()
        .eq('user_id', this.userId)

      // Add setup parts to current parts
      const currentParts = setupParts.map(part => ({
        user_id: this.userId!,
        component: part.component,
        name: part.name,
        amount: part.amount,
      }))

      const { error } = await supabase
        .from('parts')
        .insert(currentParts)

      if (error) {
        console.error('Error loading setup to current parts:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in loadSetupToCurrentParts:', err)
      return false
    }
  }

  async deleteSetup(setupId: string): Promise<boolean> {
    await this.ensureUser()

    try {
      // Delete setup parts first (due to foreign key constraint)
      const { error: partsError } = await supabase
        .from('setup_parts')
        .delete()
        .eq('setup_id', setupId)

      if (partsError) {
        console.error('Error deleting setup parts:', partsError)
        return false
      }

      // Delete the setup
      const { error: setupError } = await supabase
        .from('pc_setups')
        .delete()
        .eq('id', setupId)
        .eq('user_id', this.userId)

      if (setupError) {
        console.error('Error deleting setup:', setupError)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in deleteSetup:', err)
      return false
    }
  }

  async updateSetup(setupId: string, name: string, description: string, parts: Array<{ component: string; name: string; amount: number }>): Promise<boolean> {
    await this.ensureUser()

    try {
      // Calculate total amount
      const totalAmount = parts.reduce((sum, part) => sum + part.amount, 0)

      // Update the setup
      const { error: setupError } = await supabase
        .from('pc_setups')
        .update({
          name,
          description,
          total_amount: totalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', setupId)
        .eq('user_id', this.userId)

      if (setupError) {
        console.error('Error updating setup:', setupError)
        return false
      }

      // Delete existing parts
      const { error: deleteError } = await supabase
        .from('setup_parts')
        .delete()
        .eq('setup_id', setupId)

      if (deleteError) {
        console.error('Error deleting existing setup parts:', deleteError)
        return false
      }

      // Add new parts
      const setupParts = parts.map(part => ({
        setup_id: setupId,
        component: part.component,
        name: part.name,
        amount: part.amount,
      }))

      const { error: partsError } = await supabase
        .from('setup_parts')
        .insert(setupParts)

      if (partsError) {
        console.error('Error adding new setup parts:', partsError)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in updateSetup:', err)
      return false
    }
  }
}

// Export singleton instance
export const db = new DatabaseService()
