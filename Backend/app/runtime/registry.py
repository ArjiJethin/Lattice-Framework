"""Runtime adapter registry with explicit availability reporting."""

from __future__ import annotations

from app.core.errors import RuntimeUnavailableError
from app.core.settings import Settings
from app.runtime.base import BaseRuntimeAdapter, RuntimeCapabilities
from app.runtime.fake import FakeRuntimeAdapter, FakeRuntimeProfile
from app.runtime.llamacpp import LlamaCppAdapter


class RuntimeRegistry:
    """Resolves adapter ids to instances; test doubles can be registered."""

    def __init__(
        self,
        settings: Settings,
        *,
        fake_profile: FakeRuntimeProfile | None = None,
        adapters: list[BaseRuntimeAdapter] | None = None,
    ) -> None:
        self.settings = settings
        self._adapters: dict[str, BaseRuntimeAdapter] = {}
        if adapters is not None:
            for adapter in adapters:
                self._adapters[adapter.adapter_id] = adapter
        else:
            self._adapters["llamacpp"] = LlamaCppAdapter()
            if settings.runtime_allow_fake:
                self._adapters["fake"] = FakeRuntimeAdapter(fake_profile)

    def register(self, adapter: BaseRuntimeAdapter) -> None:
        self._adapters[adapter.adapter_id] = adapter

    def list_capabilities(self) -> list[RuntimeCapabilities]:
        return [adapter.capabilities() for adapter in self._adapters.values()]

    def get_capabilities(self, adapter_id: str) -> RuntimeCapabilities:
        adapter = self._adapters.get(adapter_id)
        if adapter is None:
            from app.core.enums import AvailabilityStatus

            return RuntimeCapabilities(
                adapter_id=adapter_id,
                available=False,
                status=AvailabilityStatus.UNSUPPORTED,
                reason=f"unknown runtime adapter '{adapter_id}'",
            )
        return adapter.capabilities()

    def resolve(self, adapter_id: str | None) -> tuple[BaseRuntimeAdapter, RuntimeCapabilities]:
        requested = (adapter_id or self.settings.runtime_adapter or "auto").lower()
        if requested == "auto":
            for adapter in self._adapters.values():
                if adapter.is_test_runtime:
                    continue
                capabilities = adapter.capabilities()
                if capabilities.available:
                    return adapter, capabilities
            raise RuntimeUnavailableError(
                "No usable inference runtime adapter is installed. Install the optional "
                "llama-cpp-python extra or explicitly enable the test-only fake adapter.",
                details={
                    "configured_adapter": self.settings.runtime_adapter,
                    "candidates": {
                        capability.adapter_id: capability.status.value
                        for capability in self.list_capabilities()
                    },
                },
            )
        adapter = self._adapters.get(requested)
        if adapter is None:
            raise RuntimeUnavailableError(
                f"Runtime adapter '{requested}' is not registered",
                details={"registered": sorted(self._adapters)},
            )
        if adapter.is_test_runtime and not self.settings.runtime_allow_fake:
            raise RuntimeUnavailableError(
                "The fake runtime adapter is disabled; it is only available when "
                "LATTICE_RUNTIME_ALLOW_FAKE=true and must never be used for real research"
            )
        capabilities = adapter.capabilities()
        if not capabilities.available:
            raise RuntimeUnavailableError(
                capabilities.reason or "runtime adapter is not available",
                details={"adapter_id": requested, "status": capabilities.status.value},
            )
        return adapter, capabilities

    @property
    def adapter_ids(self) -> list[str]:
        return sorted(self._adapters)


__all__ = ["RuntimeRegistry"]
