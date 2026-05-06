package com.mediacontrol.app.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.palette.graphics.Palette
import coil.ImageLoader
import coil.request.ImageRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

private val DEFAULT_COLORS = listOf(
    Color(0xFF1A1A2E),
    Color(0xFF16213E),
    Color(0xFF0F3460),
    Color(0xFF533483)
)

private const val MAX_BLOBS = 4
private const val BASE_DURATION = 8000
private const val STEP_DURATION = 2000
private const val TWO_PI = (PI * 2).toFloat()

@Composable
fun MeshGradientBackground(
    artUrl: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val imageLoader = remember { ImageLoader(context) }
    var colorList by remember(artUrl) { mutableStateOf(DEFAULT_COLORS) }

    LaunchedEffect(artUrl) {
        if (artUrl.isNotEmpty()) {
            withContext(Dispatchers.IO) {
                try {
                    val request = ImageRequest.Builder(context)
                        .data(artUrl)
                        .size(300)
                        .build()
                    val drawable = imageLoader.execute(request).drawable
                    val bitmap = android.graphics.drawable.BitmapDrawable::class.java
                        .cast(drawable)
                        ?.bitmap
                    bitmap?.let { bm ->
                        val palette = Palette.from(bm).generate()
                        val extracted = mutableListOf<Color>()
                        palette.let { p ->
                            p.darkVibrantSwatch?.let { extracted.add(Color(it.rgb)) }
                            p.vibrantSwatch?.let { extracted.add(Color(it.rgb)) }
                            p.lightVibrantSwatch?.let { extracted.add(Color(it.rgb)) }
                            p.darkMutedSwatch?.let { extracted.add(Color(it.rgb)) }
                            p.mutedSwatch?.let { extracted.add(Color(it.rgb)) }
                        }
                        if (extracted.isNotEmpty()) {
                            withContext(Dispatchers.Main) {
                                colorList = extracted
                            }
                        }
                    }
                } catch (_: Exception) { }
            }
        } else {
            colorList = DEFAULT_COLORS
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "mesh")
    val blobCount = minOf(colorList.size, MAX_BLOBS)

    val offsets = (0 until blobCount).map { index ->
        val angleOffset = (index.toFloat() / blobCount) * TWO_PI
        val phaseShift = PI.toFloat() + angleOffset

        val ox = infiniteTransition.animateFloat(
            initialValue = cos(angleOffset) * 0.3f,
            targetValue = cos(phaseShift) * 0.3f,
            animationSpec = infiniteRepeatable(
                animation = tween(BASE_DURATION + index * STEP_DURATION, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ), label = "ox$index"
        )
        val oy = infiniteTransition.animateFloat(
            initialValue = sin(angleOffset) * 0.3f,
            targetValue = sin(phaseShift) * 0.3f,
            animationSpec = infiniteRepeatable(
                animation = tween(BASE_DURATION + index * STEP_DURATION, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ), label = "oy$index"
        )
        ox to oy
    }

    Canvas(modifier = modifier) {
        val dim = maxOf(size.width, size.height)
        val radius = dim * 0.8f

        drawRect(color = colorList.first().copy(alpha = 0.4f))

        val colors = colorList.take(blobCount)
        for (i in 0 until minOf(colors.size, offsets.size)) {
            val (ox, oy) = offsets[i]
            val cx = size.width * (0.5f + ox.value * 0.5f)
            val cy = size.height * (0.5f + oy.value * 0.5f)

            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        colors[i].copy(alpha = 0.45f),
                        colors[i].copy(alpha = 0.15f),
                        Color.Transparent
                    )
                ),
                radius = radius,
                center = Offset(cx, cy)
            )
        }
    }
}
