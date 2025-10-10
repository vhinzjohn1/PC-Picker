import { supabase, type Part, type UserProfile } from './supabase'

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
        .single()

      if (error) {
        console.error('Error fetching currency:', error)
        return 'PHP'
      }

      return data?.currency || 'PHP'
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
}

// Export singleton instance
export const db = new DatabaseService()
