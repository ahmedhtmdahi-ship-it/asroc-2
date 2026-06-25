<?php

namespace App\Http\Controllers;

use App\Enums\ExternalProviderType;
use App\Http\Resources\ExternalProviderResource;
use App\Models\ExternalProvider;
use App\Models\ExternalReferral;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;

class ExternalProviderController extends Controller
{
    /**
     * List providers with optional filters: type, specialty (partial), name (search).
     * Paginated 15/page.
     */
    public function index(Request $request)
    {
        $query = ExternalProvider::query();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('specialty')) {
            $query->where('specialty', 'like', '%' . $request->specialty . '%');
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $providers = $query->orderBy('name')->paginate(15);

        return ExternalProviderResource::collection($providers);
    }

    /**
     * Create a new external provider.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'type'      => ['required', new Enum(ExternalProviderType::class)],
            'specialty' => ['required', 'string', 'max:255'],
            'address'   => ['required', 'string', 'max:500'],
            'phone'     => ['required', 'string', 'max:50'],
            'latitude'  => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'notes'     => ['nullable', 'string'],
        ]);

        $provider = ExternalProvider::create($validated);

        return (new ExternalProviderResource($provider))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Show a single external provider.
     */
    public function show($id)
    {
        $provider = ExternalProvider::findOrFail($id);

        return new ExternalProviderResource($provider);
    }

    /**
     * Update an existing external provider.
     */
    public function update(Request $request, $id)
    {
        $provider = ExternalProvider::findOrFail($id);

        $validated = $request->validate([
            'name'      => ['sometimes', 'required', 'string', 'max:255'],
            'type'      => ['sometimes', 'required', new Enum(ExternalProviderType::class)],
            'specialty' => ['sometimes', 'required', 'string', 'max:255'],
            'address'   => ['sometimes', 'required', 'string', 'max:500'],
            'phone'     => ['sometimes', 'required', 'string', 'max:50'],
            'latitude'  => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'notes'     => ['nullable', 'string'],
        ]);

        $provider->update($validated);

        return new ExternalProviderResource($provider);
    }

    /**
     * Delete an external provider.
     * Returns 422 if the provider has linked referrals.
     */
    public function destroy($id)
    {
        $provider = ExternalProvider::findOrFail($id);

        $hasReferrals = ExternalReferral::where('external_provider_id', $provider->id)->exists();

        if ($hasReferrals) {
            return response()->json([
                'message' => 'لا يمكن حذف مزود له تحويلات طبية',
            ], 422);
        }

        $provider->delete();

        return response()->json(['message' => 'Provider deleted successfully.']);
    }
}
