import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'https://defiant-meals-backend.onrender.com';

const Menu = ({ handleAddToCart, cartItems = [], updateCartItemQuantity, removeFromCart }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedItemOptions, setSelectedItemOptions] = useState({});

  // Get count of specific item in cart - use parent cart state
  const getItemCartCount = (itemId) => {
    const cartItem = cartItems.find(item => item.originalId === itemId || item.id === itemId);
    return cartItem ? cartItem.quantity || 1 : 0;
  };

  // Handle quantity changes - update parent cart state
  const handleQuantityChange = (item, change) => {
    const currentCount = getItemCartCount(item._id);
    const newCount = currentCount + change;
    
    if (newCount <= 0) {
      // Find the cart item to remove
      const cartItem = cartItems.find(cartItem => cartItem.originalId === item._id || cartItem.id === item._id);
      if (cartItem) {
        removeFromCart(cartItem.id || cartItem.originalId);
      }
    } else if (currentCount === 0) {
      handleAddToCartWithOptions(item);
    } else {
      // Find the cart item to update
      const cartItem = cartItems.find(cartItem => cartItem.originalId === item._id || cartItem.id === item._id);
      if (cartItem) {
        updateCartItemQuantity(cartItem.id || cartItem.originalId, newCount);
      }
    }
  };

  // Handle flavor selection (single select)
  const handleFlavorChange = (itemId, flavor) => {
    setSelectedItemOptions(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selectedFlavor: flavor
      }
    }));
  };

  // Handle addon selection (multi-select)
  const handleAddonChange = (itemId, addon, isChecked) => {
    setSelectedItemOptions(prev => {
      const currentAddons = prev[itemId]?.selectedAddons || [];
      const newAddons = isChecked 
        ? [...currentAddons, addon]
        : currentAddons.filter(a => a.name !== addon.name);
      
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          selectedAddons: newAddons
        }
      };
    });
  };

  // Calculate total price including add-ons
  const calculateItemPrice = (basePrice, itemId) => {
    const options = selectedItemOptions[itemId] || {};
    let totalPrice = parseFloat(basePrice);
    
    // Add flavor price if it has one
    if (options.selectedFlavor && options.selectedFlavor.price) {
      totalPrice += parseFloat(options.selectedFlavor.price);
    }
    
    // Add addon prices
    if (options.selectedAddons) {
      totalPrice += options.selectedAddons.reduce((sum, addon) => sum + parseFloat(addon.price || 0), 0);
    }
    
    return totalPrice;
  };

  // Enhanced add to cart with options
  const handleAddToCartWithOptions = (item) => {
    const options = selectedItemOptions[item._id] || {};
    const totalPrice = calculateItemPrice(item.price, item._id);
    
    // Create a unique identifier for cart items with different customizations
    const customizationId = `${item._id}_${options.selectedFlavor?.name || 'no-flavor'}_${(options.selectedAddons || []).map(a => a.name).sort().join('_')}`;
    
    const cartItem = {
      id: customizationId,
      originalId: item._id,
      name: item.name,
      price: totalPrice,
      basePrice: parseFloat(item.price),
      description: item.description,
      category: item.category,
      calories: item.calories,
      protein: item.protein,
      fats: item.fats,
      carbs: item.carbs,
      imageUrl: item.imageUrl,
      selectedFlavor: options.selectedFlavor || null,
      selectedAddons: options.selectedAddons || [],
      quantity: 1,
      customizations: {
        flavor: options.selectedFlavor?.name || null,
        addons: (options.selectedAddons || []).map(a => a.name)
      }
    };
    
    handleAddToCart(cartItem);
    
    // Clear selections after adding to cart
    setSelectedItemOptions(prev => ({
      ...prev,
      [item._id]: {}
    }));
  };

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        const data = await response.json();
        
        const availableCategories = data
          .filter(cat => cat.available)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        
        const categoriesWithAll = [
          { id: 'All Items', name: 'All Items' },
          ...availableCategories.map(cat => ({ id: cat.name, name: cat.name }))
        ];
        
        setCategories(categoriesWithAll);
      } catch (err) {
        console.error('Failed to load categories:', err);
        setCategories([
          { id: 'All Items', name: 'All Items' },
          { id: 'High Protein', name: 'High Protein' },
          { id: 'Quality Carbs', name: 'Quality Carbs' },
          { id: 'Healthier Options', name: 'Healthier Options' },
          { id: 'Snacks', name: 'Snacks' }
        ]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch menu items
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/menu`);
        const data = await response.json();
        setMenuItems(data);
      } catch (err) {
        console.error('Failed to load menu items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  const availableItems = menuItems.filter(item => item.available);
  const filteredItems = selectedCategory === 'All Items'
    ? availableItems
    : availableItems.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen py-8"> 
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Our Menu</h1>
        <p className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Discover our carefully crafted selection of nutritious and delicious meals,
          made with fresh, high-quality ingredients.
        </p>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categoriesLoading ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Loading categories...</p>
            </div>
          ) : (
            categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-md ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-200 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                }`}
              >
                {category.name}
              </button>
            ))
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">Loading menu items...</p>
          </div>
        )}

        {/* Menu Items Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map(item => {
              const cartCount = getItemCartCount(item._id);
              const itemPrice = calculateItemPrice(item.price, item._id);
              const currentOptions = selectedItemOptions[item._id] || {};
              
              return (
                <div 
                  key={item._id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-blue-200"
                >
                  {/* Image Section */}
                  {item.imageUrl && (
                    <div className="relative overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-48 object-cover hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Content Section */}
                  <div className="p-6">
                    {!item.imageUrl && (
                      <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mb-4 flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">🍽️ Delicious Meal</span>
                      </div>
                    )}
                    
                    <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                    <p className="text-gray-600 mb-4">{item.description}</p>

                    {/* Flavor Options */}
                    {item.flavorOptions && item.flavorOptions.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Choose Flavor:
                        </label>
                        <select 
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={currentOptions.selectedFlavor?.name || ''}
                          onChange={(e) => {
                            const flavor = item.flavorOptions.find(f => f.name === e.target.value);
                            handleFlavorChange(item._id, flavor || null);
                          }}
                        >
                          <option value="">Select flavor...</option>
                          {item.flavorOptions.map(flavor => (
                            <option key={flavor.name} value={flavor.name}>
                              {flavor.name} {flavor.price > 0 && `(+$${flavor.price.toFixed(2)})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Add-on Options */}
                    {item.addonOptions && item.addonOptions.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Add-ons:
                        </label>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {item.addonOptions.map(addon => (
                            <label key={addon.name} className="flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={(currentOptions.selectedAddons || []).some(a => a.name === addon.name)}
                                onChange={(e) => handleAddonChange(item._id, addon, e.target.checked)}
                              />
                              <span className="ml-2 text-sm">
                                {addon.name} (+${addon.price.toFixed(2)})
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nutritional Information */}
                    <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {item.protein && (
                          <div className="bg-white rounded-md p-2 shadow-sm">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Protein</div>
                            <div className="text-sm font-semibold text-blue-600">{item.protein}</div>
                          </div>
                        )}
                        {item.fats && (
                          <div className="bg-white rounded-md p-2 shadow-sm">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fats</div>
                            <div className="text-sm font-semibold text-orange-600">{item.fats}</div>
                          </div>
                        )}
                        {item.carbs && (
                          <div className="bg-white rounded-md p-2 shadow-sm">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Carbs</div>
                            <div className="text-sm font-semibold text-green-600">{item.carbs}</div>
                          </div>
                        )}
                      </div>
                      {item.calories && (
                        <div className="text-center mt-2 text-sm text-gray-600">
                          {item.calories} calories
                        </div>
                      )}
                    </div>

                    {/* Price Display */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-right w-full">
                        <span className="text-2xl font-bold text-blue-600">
                          ${itemPrice.toFixed(2)}
                        </span>
                        {itemPrice !== parseFloat(item.price) && (
                          <div className="text-sm text-gray-500">
                            Base: ${parseFloat(item.price).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add to Cart Button with Always Visible Quantity Controls */}
                    <div className="flex items-center justify-between bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 active:scale-95 transform">
                      <span>Add to Cart</span>
                      <div className="flex items-center space-x-2 bg-white rounded-full px-2 py-1">
                        <button
                          onClick={() => handleQuantityChange(item, -1)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all active:scale-90 ${
                            cartCount === 0 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-red-500 hover:bg-red-600'
                          }`}
                          disabled={cartCount === 0}
                        >
                          -
                        </button>
                        <span className="text-gray-800 font-bold min-w-[16px] text-center text-sm">
                          {cartCount}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item, 1)}
                          className="w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white font-bold text-sm transition-all active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">No items found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;