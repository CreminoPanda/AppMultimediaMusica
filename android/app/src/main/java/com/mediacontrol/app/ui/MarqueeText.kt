package com.mediacontrol.app.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow

@Composable
fun MarqueeText(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = LocalTextStyle.current,
    color: Color = Color.White,
    fontWeight: FontWeight? = null,
    pauseMs: Int = 2000,
) {
    var textWidth by remember { mutableIntStateOf(0) }
    var containerWidth by remember { mutableIntStateOf(0) }
    val needsScroll = textWidth > containerWidth

    val distance = if (needsScroll) (textWidth - containerWidth + 40f) else 0f
    val scrollDuration = (distance / 30f * 1000).toInt().coerceAtLeast(1500)

    val infiniteTransition = rememberInfiniteTransition(label = "marquee")
    val offset = infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -distance,
        animationSpec = infiniteRepeatable(
            animation = tween(scrollDuration, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
            initialStartOffset = androidx.compose.animation.core.StartOffset(pauseMs),
        ),
        label = "marquee_offset"
    )

    Box(
        modifier = modifier
            .clipToBounds()
            .onSizeChanged { containerWidth = it.width }
    ) {
        Text(
            text = text,
            style = style,
            color = color,
            fontWeight = fontWeight,
            softWrap = false,
            overflow = TextOverflow.Visible,
            maxLines = 1,
            onTextLayout = { textWidth = it.size.width },
            modifier = Modifier.graphicsLayer {
                translationX = if (needsScroll) offset.value else 0f
            }
        )
    }
}
